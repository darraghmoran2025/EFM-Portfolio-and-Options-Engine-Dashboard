const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

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

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "private, max-age=30");
  res.end(JSON.stringify(payload));
}

async function fetchYahoo(symbol, start, end) {
  const period1 = epoch(start);
  const period2 = epoch(end, 1);
  const query = period1 && period2
    ? `period1=${period1}&period2=${period2}&interval=1d`
    : "range=5d&interval=1d";

  const response = await fetch(`${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?${query}`, {
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
    .map((timestamp, index) => [timestamp, closes[index]])
    .filter(([, close]) => close !== null && close !== undefined)
    .map(([timestamp, close]) => [timestamp, Number(close)]);

  const livePrice = Number(meta.regularMarketPrice ?? history.at(-1)?.[1]);
  const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? history.at(-2)?.[1]);
  const quote = {
    requestSymbol: symbol,
    symbol: meta.symbol || symbol,
    currency: meta.currency || "",
    exchangeName: meta.fullExchangeName || meta.exchangeName || "",
    regularMarketPrice: Number.isFinite(livePrice) ? livePrice : null,
    regularMarketPreviousClose: Number.isFinite(previousClose) ? previousClose : null,
    regularMarketTime: meta.regularMarketTime || null,
    marketState: meta.marketState || "",
  };

  if (period1 && period2 && history.length >= 2) {
    const [periodStartTime, periodStartPrice] = history[0];
    const [periodEndTime, periodEndPrice] = history.at(-1);
    quote.periodStart = start;
    quote.periodEnd = end;
    quote.periodStartTime = periodStartTime;
    quote.periodEndTime = periodEndTime;
    quote.periodStartPrice = periodStartPrice;
    quote.periodEndPrice = periodEndPrice;
    quote.periodReturn = periodStartPrice > 0 ? periodEndPrice / periodStartPrice - 1 : null;
  }

  return quote;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    const url = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
    const symbols = symbolsFrom(url.searchParams.get("symbols"));
    if (!symbols.length) {
      sendJson(res, 400, { error: "No symbols supplied." });
      return;
    }

    const start = url.searchParams.get("start") || "";
    const end = url.searchParams.get("end") || "";
    const results = await Promise.allSettled(symbols.map((symbol) => fetchYahoo(symbol, start, end)));
    const quotes = [];
    const errors = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        quotes.push(result.value);
      } else {
        errors.push(`${symbols[index]}: ${result.reason?.message || result.reason}`);
      }
    });

    const order = new Map(symbols.map((symbol, index) => [symbol, index]));
    quotes.sort((a, b) => (order.get(a.requestSymbol) ?? 999) - (order.get(b.requestSymbol) ?? 999));

    sendJson(res, 200, {
      source: "Yahoo Finance",
      fetchedAt: Math.floor(Date.now() / 1000),
      requestedSymbols: symbols,
      quotes,
      errors,
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unexpected market-data failure.",
    });
  }
};
