import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname);
const staticRoot = resolve(root, "static");
const yahooChartUrl = "https://query1.finance.yahoo.com/v8/finance/chart";
const port = Number(process.env.PORT || 5177);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".svg", "image/svg+xml"],
]);

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "private, max-age=30",
  });
  res.end(body);
}

function symbolsFrom(rawSymbols) {
  const seen = new Set();
  return String(rawSymbols || "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => {
      if (!symbol || seen.has(symbol)) return false;
      seen.add(symbol);
      return true;
    })
    .slice(0, 80);
}

function epoch(dateText, extraDays = 0) {
  if (!dateText) return null;
  const parsed = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setUTCDate(parsed.getUTCDate() + extraDays);
  return Math.floor(parsed.getTime() / 1000);
}

async function fetchYahoo(symbol, start, end) {
  const period1 = epoch(start);
  const period2 = epoch(end, 1);
  const query = period1 && period2
    ? `period1=${period1}&period2=${period2}&interval=1d`
    : "range=5d&interval=1d";
  const response = await fetch(`${yahooChartUrl}/${encodeURIComponent(symbol)}?${query}`, {
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0 (compatible; EFMPortfolioOptionsDashboard/1.0)",
    },
  });
  if (!response.ok) throw new Error(`${symbol}: Yahoo returned ${response.status}`);
  const payload = await response.json();
  const item = payload.chart?.result?.[0];
  if (!item) throw new Error(`${symbol}: no chart result`);

  const meta = item.meta || {};
  const closes = item.indicators?.quote?.[0]?.close || [];
  const timestamps = item.timestamp || [];
  const history = timestamps
    .map((ts, index) => [ts, closes[index]])
    .filter(([, close]) => close !== null && close !== undefined)
    .map(([ts, close]) => [ts, Number(close)]);

  const livePrice = Number(meta.regularMarketPrice ?? history.at(-1)?.[1]);
  const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? history.at(-2)?.[1]);
  const quote = {
    requestSymbol: symbol,
    symbol: meta.symbol || symbol,
    currency: meta.currency || "",
    exchangeName: meta.fullExchangeName || meta.exchangeName || "",
    regularMarketPrice: Number.isFinite(livePrice) ? livePrice : null,
    regularMarketPreviousClose: Number.isFinite(previousClose) ? previousClose : null,
    regularMarketTime: meta.regularMarketTime,
    marketState: meta.marketState || "",
  };

  if (period1 && period2 && history.length >= 2) {
    const [startTime, startPrice] = history[0];
    const [endTime, endPrice] = history.at(-1);
    quote.periodStart = start;
    quote.periodEnd = end;
    quote.periodStartTime = startTime;
    quote.periodEndTime = endTime;
    quote.periodStartPrice = startPrice;
    quote.periodEndPrice = endPrice;
    quote.periodReturn = startPrice > 0 ? endPrice / startPrice - 1 : null;
  }
  return quote;
}

async function handleMarketData(req, res, url) {
  const symbols = symbolsFrom(url.searchParams.get("symbols"));
  if (!symbols.length) {
    json(res, 400, { error: "No symbols supplied." });
    return;
  }
  const start = url.searchParams.get("start") || "";
  const end = url.searchParams.get("end") || "";
  const results = await Promise.allSettled(symbols.map((symbol) => fetchYahoo(symbol, start, end)));
  const quotes = [];
  const errors = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") quotes.push(result.value);
    else errors.push(`${symbols[index]}: ${result.reason?.message || result.reason}`);
  });
  const order = new Map(symbols.map((symbol, index) => [symbol, index]));
  quotes.sort((a, b) => (order.get(a.requestSymbol) ?? 999) - (order.get(b.requestSymbol) ?? 999));
  json(res, 200, {
    source: "Yahoo Finance",
    fetchedAt: Math.floor(Date.now() / 1000),
    requestedSymbols: symbols,
    quotes,
    errors,
  });
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const candidate = resolve(staticRoot, normalize(requested).replace(/^[/\\]+/, ""));
  if (!candidate.startsWith(staticRoot)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  let target = candidate;
  try {
    const info = await stat(target);
    if (!info.isFile()) target = join(staticRoot, "index.html");
  } catch {
    target = join(staticRoot, "index.html");
  }
  const body = await readFile(target);
  res.writeHead(200, {
    "content-type": mimeTypes.get(extname(target)) || "application/octet-stream",
    "cache-control": "public, max-age=0, must-revalidate",
  });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/api/market-data") {
      await handleMarketData(req, res, url);
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : "Server error." });
  }
}).listen(port, () => {
  console.log(`EFM dashboard running at http://localhost:${port}`);
});
