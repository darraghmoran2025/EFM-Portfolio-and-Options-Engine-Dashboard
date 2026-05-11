const CAPITAL = 5_000_000;
const SNAPSHOT_START = "2026-01-02";
const SNAPSHOT_END = "2026-04-17";
const MARKET_DATA_ENABLED = ["localhost", "127.0.0.1"].includes(window.location.hostname);

const ETFS = [
  { ticker: "VWRL", yahoo: "VWRL.AS", name: "Vanguard FTSE All-World UCITS ETF", bucket: "Core", type: "Broad global equity", ter: 0.0022, allocation: 0.35, geography: "Global - 49 countries", pe: 17.8, stdev: 0.128, fallbackReturn: 0.045, notes: "Single-fund access to developed and emerging market equities." },
  { ticker: "WSML", yahoo: "WSML.L", name: "iShares MSCI World Small Cap UCITS ETF", bucket: "Core", type: "Small-cap developed equity", ter: 0.0035, allocation: 0.12, geography: "Global Developed", pe: 16.2, stdev: 0.181, fallbackReturn: -0.015, notes: "Adds developed-market small-cap factor exposure absent from VWRL." },
  { ticker: "AEEM", yahoo: "AEEM.PA", name: "Amundi MSCI Emerging Markets UCITS ETF", bucket: "Core", type: "Emerging market equity", ter: 0.0020, allocation: 0.10, geography: "EM - China, India, Brazil", pe: 14.1, stdev: 0.162, fallbackReturn: 0.082, notes: "Dedicated emerging-market sleeve for higher-growth equity exposure." },
  { ticker: "ESESG", yahoo: "ESESG.PA", name: "Lyxor MSCI Europe ESG Leaders UCITS ETF", bucket: "Core", type: "European ESG large-cap", ter: 0.0014, allocation: 0.08, geography: "Europe ex-UK tilt", pe: 15.6, stdev: 0.146, fallbackReturn: 0.066, notes: "European equity tilt with ESG screen and lower USD concentration." },
  { ticker: "WCLD", yahoo: "WCLD.L", name: "WisdomTree Cloud Computing UCITS ETF", bucket: "Satellite", type: "Cloud / SaaS thematic equity", ter: 0.0040, allocation: 0.08, geography: "Global - US dominated", pe: 44.2, stdev: 0.242, fallbackReturn: -0.09, notes: "Pure-play SaaS and cloud exposure aligned with AI and automation interest." },
  { ticker: "NDIA", yahoo: "NDIA.L", name: "iShares MSCI India UCITS ETF", bucket: "Satellite", type: "Single-country India equity", ter: 0.0065, allocation: 0.06, geography: "India", pe: 23.4, stdev: 0.186, fallbackReturn: 0.041, notes: "Dedicated India allocation for demographic and digital-economy growth." },
  { ticker: "CMOD", yahoo: "CMOD.L", name: "Invesco Bloomberg Commodity UCITS ETF", bucket: "Satellite", type: "Commodity / inflation hedge", ter: 0.0019, allocation: 0.05, geography: "Global commodity producers", pe: 18.6, stdev: 0.172, fallbackReturn: 0.076, notes: "Addresses inflation and rising commodity price concerns within the equity mandate." },
  { ticker: "DFNS", yahoo: "DFNS.L", name: "VanEck Defense UCITS ETF", bucket: "Satellite", type: "Defence and security thematic equity", ter: 0.0055, allocation: 0.05, geography: "Global - EU and US defence", pe: 21.8, stdev: 0.198, fallbackReturn: 0.18, notes: "Direct geopolitical-risk hedge through listed defence companies." },
  { ticker: "XDEQ", yahoo: "XDEQ.DE", name: "Xtrackers MSCI World Quality UCITS ETF", bucket: "Satellite", type: "Quality factor equity", ter: 0.0025, allocation: 0.06, geography: "Global Developed", pe: 26.4, stdev: 0.138, fallbackReturn: 0.052, notes: "Quality factor exposure for high ROIC, stable earnings and lower leverage." },
  { ticker: "AGED", yahoo: "AGED.L", name: "iShares Ageing Population UCITS ETF", bucket: "Satellite", type: "Healthcare / demographics thematic", ter: 0.0040, allocation: 0.05, geography: "Global", pe: 24.2, stdev: 0.152, fallbackReturn: 0.028, notes: "Non-cyclical demographic exposure linked to ageing populations." },
];

const GEOGRAPHY = [
  ["United States", 0.387],
  ["Europe ex-UK", 0.142],
  ["China A + H shares", 0.079],
  ["India", 0.061],
  ["United Kingdom", 0.038],
  ["Japan", 0.052],
  ["Other Asia-Pacific", 0.034],
  ["Latin America", 0.025],
  ["Other / Global", 0.182],
];

const SECTORS = [
  ["Information Technology", 0.228],
  ["Financials", 0.148],
  ["Healthcare", 0.118],
  ["Industrials", 0.102],
  ["Consumer Discretionary", 0.091],
  ["Energy", 0.074],
  ["Materials", 0.058],
  ["Communication Services", 0.056],
  ["Consumer Staples", 0.048],
  ["Real Estate / Other", 0.077],
];

const RISK_NOTES = [
  ["US equity concentration", "The portfolio remains structurally US-heavy through broad developed-market and thematic ETFs. Non-US exposure above 61% acts as the counterbalance."],
  ["Thematic overlap", "Cloud and quality ETFs overlap with broad market holdings, intentionally increasing technology and quality exposure rather than adding unrelated return drivers."],
  ["Geopolitical risk", "Dedicated defence and India allocations address geopolitical exposure, while the EM sleeve still carries China and policy risk."],
  ["Inflation / commodities", "CMOD provides commodity-linked equity exposure because the client mandate excludes direct physical commodities."],
];

const STRATEGIES = [
  {
    id: "tsla-put-spread",
    title: "TSLA Bull Put Spread",
    underlying: "TSLA",
    spot: 400.62,
    date: "18 Apr 2026",
    expiry: "15 May 2026",
    iv: "68%",
    thesis: "Moderately bullish or neutral view into TSLA earnings risk.",
    maxProfit: "$13.28/share ($1,328/contract)",
    maxLoss: "$16.72/share ($1,672/contract)",
    breakeven: "$386.72",
    range: [310, 450],
    rows: [310, 330, 350, 360, 370, 375, 380, 385, 387, 390, 395, 400, 405, 410, 420, 430, 450],
    legs: [
      { action: "Buy", type: "Put", strike: 370, premium: 15.23, qty: 1 },
      { action: "Sell", type: "Put", strike: 400, premium: 28.51, qty: 1 },
    ],
  },
  {
    id: "tsla-butterfly",
    title: "TSLA Long Call Butterfly",
    underlying: "TSLA",
    spot: 400.62,
    date: "18 Apr 2026",
    expiry: "15 May 2026",
    iv: "68%",
    thesis: "Range-bound / low-volatility view where TSLA finishes near $400.",
    maxProfit: "$25.23/share ($2,523/contract)",
    maxLoss: "$4.77/share ($477/contract)",
    breakeven: "$374.77 / $425.23",
    range: [310, 465],
    rows: [310, 340, 370, 375, 380, 385, 390, 395, 400, 405, 410, 415, 420, 425, 430, 445, 465],
    legs: [
      { action: "Buy", type: "Call", strike: 370, premium: 47.02, qty: 1 },
      { action: "Sell", type: "Call", strike: 400, premium: 30.40, qty: 2 },
      { action: "Buy", type: "Call", strike: 430, premium: 18.55, qty: 1 },
    ],
  },
  {
    id: "tsla-strangle",
    title: "TSLA Long Strangle",
    underlying: "TSLA",
    spot: 400.62,
    date: "18 Apr 2026",
    expiry: "15 May 2026",
    iv: "68%",
    thesis: "High-volatility view around TSLA earnings, with direction uncertain.",
    maxProfit: "Unlimited upside / substantial downside",
    maxLoss: "$22.03/share ($2,203/contract)",
    breakeven: "$327.97 / $472.03",
    range: [270, 520],
    rows: [270, 290, 310, 328, 345, 360, 372, 380, 390, 400, 410, 422, 432, 440, 450, 465, 480, 500, 520],
    legs: [
      { action: "Buy", type: "Put", strike: 350, premium: 9.08, qty: 1 },
      { action: "Buy", type: "Call", strike: 450, premium: 12.95, qty: 1 },
    ],
  },
  {
    id: "nvda-condor",
    title: "NVDA Short Iron Condor",
    underlying: "NVDA",
    spot: 201.68,
    date: "18 Apr 2026",
    expiry: "15 May 2026",
    iv: "52%",
    thesis: "Stable-price strategy: NVDA consolidates below its October 2025 peak.",
    maxProfit: "$7.31/share ($731/contract)",
    maxLoss: "$7.69/share ($769/contract)",
    breakeven: "$182.69 / $222.31",
    range: [150, 248],
    rows: [150, 162, 175, 182, 185, 190, 195, 200, 205, 210, 215, 220, 222, 225, 230, 238, 248],
    legs: [
      { action: "Sell", type: "Put", strike: 190, premium: 5.95, qty: 1 },
      { action: "Buy", type: "Put", strike: 175, premium: 2.10, qty: 1 },
      { action: "Sell", type: "Call", strike: 215, premium: 6.47, qty: 1 },
      { action: "Buy", type: "Call", strike: 230, premium: 3.01, qty: 1 },
    ],
  },
  {
    id: "nvda-straddle",
    title: "NVDA Long Straddle",
    underlying: "NVDA",
    spot: 201.68,
    date: "18 Apr 2026",
    expiry: "15 May 2026",
    iv: "52%",
    thesis: "High-volatility strategy for a large NVDA move with direction unknown.",
    maxProfit: "Unlimited upside / substantial downside",
    maxLoss: "$22.68/share ($2,268/contract)",
    breakeven: "$177.32 / $222.68",
    range: [155, 260],
    rows: [155, 165, 177, 182, 185, 190, 195, 200, 205, 210, 215, 220, 222, 228, 235, 248, 260],
    legs: [
      { action: "Buy", type: "Put", strike: 200, premium: 10.18, qty: 1 },
      { action: "Buy", type: "Call", strike: 200, premium: 12.50, qty: 1 },
    ],
  },
  {
    id: "nvda-long-call",
    title: "NVDA Long Call",
    underlying: "NVDA",
    spot: 201.68,
    date: "18 Apr 2026",
    expiry: "15 May 2026",
    iv: "52%",
    thesis: "Novice bullish strategy using the $210 out-of-the-money call.",
    maxProfit: "Unlimited",
    maxLoss: "$8.16/share ($816/contract)",
    breakeven: "$218.16",
    range: [160, 260],
    rows: [160, 180, 200, 210, 218, 225, 240, 260],
    legs: [
      { action: "Buy", type: "Call", strike: 210, premium: 8.16, qty: 1 },
    ],
  },
  {
    id: "nvda-bull-call",
    title: "NVDA Bull Call Spread",
    underlying: "NVDA",
    spot: 201.68,
    date: "18 Apr 2026",
    expiry: "15 May 2026",
    iv: "52%",
    thesis: "Intermediate bullish strategy with lower cost and capped upside.",
    maxProfit: "$8.97/share ($897/contract)",
    maxLoss: "$6.03/share ($603/contract)",
    breakeven: "$206.03",
    range: [160, 250],
    rows: [160, 180, 200, 206, 210, 215, 225, 250],
    legs: [
      { action: "Buy", type: "Call", strike: 200, premium: 12.50, qty: 1 },
      { action: "Sell", type: "Call", strike: 215, premium: 6.47, qty: 1 },
    ],
  },
];

let snapshotRows = ETFS.map((etf) => ({
  ...etf,
  source: "Embedded snapshot",
  periodReturn: etf.fallbackReturn,
  periodStartPrice: 100,
  periodEndPrice: 100 * (1 + etf.fallbackReturn),
}));
let liveRows = [];
let liveState = { loading: false, error: "", fetchedAt: null };

const plotConfig = { responsive: true, displayModeBar: false };

function $(id) {
  return document.getElementById(id);
}

function isDarkMode() {
  return document.body.dataset.theme === "dark";
}

function theme() {
  const styles = getComputedStyle(document.body);
  return {
    text: styles.getPropertyValue("--ink").trim(),
    grid: styles.getPropertyValue("--line").trim(),
    panel: styles.getPropertyValue("--panel").trim(),
    muted: styles.getPropertyValue("--muted").trim(),
    maroon: styles.getPropertyValue("--maroon").trim(),
    teal: styles.getPropertyValue("--teal").trim(),
    blue: styles.getPropertyValue("--blue").trim(),
    amber: styles.getPropertyValue("--amber").trim(),
  };
}

function layout(title = "", ytitle = "") {
  const t = theme();
  return {
    title: title ? { text: title, font: { size: 13 } } : undefined,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: t.panel,
    font: { color: t.text, family: "Inter, sans-serif" },
    margin: { t: title ? 42 : 18, r: 24, b: 58, l: 60 },
    xaxis: { gridcolor: t.grid, zerolinecolor: t.grid },
    yaxis: { title: ytitle, gridcolor: t.grid, zerolinecolor: t.grid },
    legend: { orientation: "h", y: -0.2 },
  };
}

function fmtPct(value, signed = false) {
  if (!Number.isFinite(value)) return "--";
  const prefix = signed && value > 0 ? "+" : "";
  return `${prefix}${(value * 100).toFixed(2)}%`;
}

function fmtMoney(value, currency = "EUR") {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value);
}

function fmtUsd(value) {
  if (!Number.isFinite(value)) return "--";
  return `$${value.toFixed(2)}`;
}

function fmtDateTime(epochSeconds) {
  if (!Number.isFinite(epochSeconds)) return "--";
  return new Date(epochSeconds * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toneClass(value) {
  if (!Number.isFinite(value)) return "";
  return value >= 0 ? "positive" : "negative";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function weightedReturn(rows) {
  return rows.reduce((sum, row) => sum + row.allocation * row.periodReturn, 0);
}

function weightedTer() {
  return ETFS.reduce((sum, row) => sum + row.allocation * row.ter, 0);
}

function renderPortfolioMetrics() {
  const ret = weightedReturn(snapshotRows);
  $("clientCapital").textContent = fmtMoney(CAPITAL);
  $("portfolioReturn").textContent = fmtPct(ret, true);
  $("portfolioReturn").className = toneClass(ret);
  $("portfolioGain").textContent = fmtMoney(CAPITAL * ret);
  $("portfolioGain").className = toneClass(ret);
}

function renderPortfolioCharts() {
  if (!window.Plotly) return;
  const t = theme();
  Plotly.react("allocationChart", [{
    type: "bar",
    x: ETFS.map((row) => row.ticker),
    y: ETFS.map((row) => row.allocation),
    marker: { color: ETFS.map((row) => row.bucket === "Core" ? t.maroon : t.teal) },
    text: ETFS.map((row) => fmtPct(row.allocation)),
    textposition: "outside",
    hovertext: ETFS.map((row) => row.name),
    hoverinfo: "text+y",
  }], { ...layout("", "Allocation"), yaxis: { tickformat: ".0%", gridcolor: t.grid } }, plotConfig);

  const buckets = ["Core", "Satellite"].map((bucket) => [
    bucket,
    ETFS.filter((row) => row.bucket === bucket).reduce((sum, row) => sum + row.allocation, 0),
  ]);
  Plotly.react("bucketChart", [{
    type: "pie",
    labels: buckets.map(([name]) => name),
    values: buckets.map(([, value]) => value),
    hole: 0.48,
    marker: { colors: [t.maroon, t.teal] },
    textinfo: "label+percent",
  }], { ...layout(), showlegend: false, margin: { t: 18, r: 18, b: 18, l: 18 } }, plotConfig);

  Plotly.react("performanceChart", [{
    type: "bar",
    x: snapshotRows.map((row) => row.ticker),
    y: snapshotRows.map((row) => row.periodReturn),
    marker: { color: snapshotRows.map((row) => row.periodReturn >= 0 ? t.teal : "#b42318") },
    text: snapshotRows.map((row) => fmtPct(row.periodReturn, true)),
    textposition: "outside",
    customdata: snapshotRows.map((row) => [row.allocation * row.periodReturn, row.source]),
    hovertemplate: "%{x}<br>Return %{y:.2%}<br>Contribution %{customdata[0]:.2%}<br>%{customdata[1]}<extra></extra>",
  }], { ...layout("", "YTD return"), yaxis: { tickformat: ".0%", gridcolor: t.grid, zerolinecolor: t.grid } }, plotConfig);

  Plotly.react("geoChart", [{
    type: "bar",
    orientation: "h",
    x: GEOGRAPHY.map(([, value]) => value),
    y: GEOGRAPHY.map(([name]) => name),
    marker: { color: t.blue },
    hovertemplate: "%{y}: %{x:.1%}<extra></extra>",
  }], { ...layout("", "Weight"), xaxis: { tickformat: ".0%", gridcolor: t.grid }, margin: { t: 18, r: 20, b: 42, l: 150 } }, plotConfig);

  Plotly.react("sectorChart", [{
    type: "bar",
    orientation: "h",
    x: SECTORS.map(([, value]) => value),
    y: SECTORS.map(([name]) => name),
    marker: { color: t.amber },
    hovertemplate: "%{y}: %{x:.1%}<extra></extra>",
  }], { ...layout("", "Weight"), xaxis: { tickformat: ".0%", gridcolor: t.grid }, margin: { t: 18, r: 20, b: 42, l: 170 } }, plotConfig);
}

function renderHoldingsTable() {
  $("holdingsTable").innerHTML = `
    <thead><tr><th>ETF</th><th>Name</th><th>Bucket</th><th>Allocation</th><th>Euro Allocation</th><th>TER</th><th>YTD Return</th><th>Contribution</th><th>P/E</th><th>3Y Std Dev</th><th>Yahoo</th></tr></thead>
    <tbody>${snapshotRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.ticker)}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.bucket)}</td>
        <td>${fmtPct(row.allocation)}</td>
        <td>${fmtMoney(CAPITAL * row.allocation)}</td>
        <td>${fmtPct(row.ter)}</td>
        <td class="${toneClass(row.periodReturn)}">${fmtPct(row.periodReturn, true)}</td>
        <td class="${toneClass(row.periodReturn)}">${fmtPct(row.allocation * row.periodReturn, true)}</td>
        <td>${row.pe.toFixed(1)}x</td>
        <td>${fmtPct(row.stdev)}</td>
        <td><a href="https://finance.yahoo.com/quote/${encodeURIComponent(row.yahoo)}" target="_blank" rel="noreferrer">${escapeHtml(row.yahoo)}</a></td>
      </tr>`).join("")}</tbody>
  `;
}

function renderRiskNotes() {
  $("riskNotes").innerHTML = RISK_NOTES.map(([title, body]) => `
    <article class="risk-note"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></article>
  `).join("");
}

function renderPortfolio() {
  renderPortfolioMetrics();
  $("snapshotStatus").textContent = snapshotRows.some((row) => row.source === "Yahoo Finance")
    ? `Historical prices loaded from Yahoo Finance for ${SNAPSHOT_START} to ${SNAPSHOT_END}.`
    : MARKET_DATA_ENABLED
      ? `Using embedded YTD 17 Apr 2026 returns until the market-data API is available. Weighted TER: ${fmtPct(weightedTer())}.`
      : `Using fixed Q2 workbook snapshot for YTD performance to 17 Apr 2026. Weighted TER: ${fmtPct(weightedTer())}.`;
  renderPortfolioCharts();
  renderHoldingsTable();
  renderRiskNotes();
}

async function fetchSnapshot() {
  if (!MARKET_DATA_ENABLED) {
    $("snapshotStatus").textContent = "Hosted deployment uses the fixed Q2 workbook snapshot. Run locally for Yahoo Finance refresh.";
    renderPortfolio();
    return;
  }
  $("snapshotStatus").textContent = "Refreshing historical ETF prices...";
  try {
    const symbols = ETFS.map((row) => row.yahoo).join(",");
    const response = await fetch(`/api/market-data?symbols=${encodeURIComponent(symbols)}&start=${SNAPSHOT_START}&end=${SNAPSHOT_END}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Market-data request failed (${response.status})`);
    const bySymbol = new Map((payload.quotes || []).map((quote) => [String(quote.requestSymbol || quote.symbol || "").toUpperCase(), quote]));
    snapshotRows = ETFS.map((etf) => {
      const quote = bySymbol.get(etf.yahoo.toUpperCase());
      if (!quote || !Number.isFinite(Number(quote.periodReturn))) {
        return { ...etf, source: "Embedded snapshot", periodReturn: etf.fallbackReturn, periodStartPrice: 100, periodEndPrice: 100 * (1 + etf.fallbackReturn) };
      }
      return {
        ...etf,
        source: "Yahoo Finance",
        periodReturn: Number(quote.periodReturn),
        periodStartPrice: Number(quote.periodStartPrice),
        periodEndPrice: Number(quote.periodEndPrice),
      };
    });
  } catch (error) {
    $("snapshotStatus").textContent = error instanceof Error ? error.message : "Could not refresh historical prices.";
  }
  renderPortfolio();
}

function intrinsic(type, strike, price) {
  return type === "Call" ? Math.max(price - strike, 0) : Math.max(strike - price, 0);
}

function legPayoff(leg, price) {
  const optionValue = intrinsic(leg.type, leg.strike, price);
  const signed = leg.action === "Buy" ? optionValue - leg.premium : leg.premium - optionValue;
  return signed * leg.qty;
}

function strategyPayoff(strategy, price) {
  return strategy.legs.reduce((sum, leg) => sum + legPayoff(leg, price), 0);
}

function strategyEntryCashflow(strategy) {
  return strategy.legs.reduce((sum, leg) => sum + (leg.action === "Sell" ? leg.premium : -leg.premium) * leg.qty, 0);
}

function renderOptions() {
  const selected = STRATEGIES.find((item) => item.id === $("strategySelect").value) || STRATEGIES[0];
  const cashflow = strategyEntryCashflow(selected);
  $("netPremium").textContent = `${cashflow >= 0 ? "Credit" : "Debit"} ${fmtUsd(Math.abs(cashflow))}/share`;
  $("maxProfit").textContent = selected.maxProfit;
  $("maxLoss").textContent = selected.maxLoss;
  $("breakeven").textContent = selected.breakeven;
  $("strategySummary").innerHTML = `
    <article class="strategy-card"><span>Underlying</span><strong>${selected.underlying} at ${fmtUsd(selected.spot)}</strong><p>Valuation date ${selected.date}; expiry ${selected.expiry}; implied volatility ${selected.iv}.</p></article>
    <article class="strategy-card"><span>Market View</span><strong>${escapeHtml(selected.title)}</strong><p>${escapeHtml(selected.thesis)}</p></article>
    <article class="strategy-card"><span>Contract Basis</span><strong>Per share and per 100-share contract</strong><p>Premiums, strikes and strategy structures are fixed to the Q5 project tables.</p></article>
  `;
  renderLegsTable(selected);
  renderPayoff(selected);
}

function renderLegsTable(strategy) {
  $("legsTable").innerHTML = `
    <thead><tr><th>Action</th><th>Type</th><th>Strike</th><th>Premium</th><th>Quantity</th><th>Entry Cashflow</th></tr></thead>
    <tbody>${strategy.legs.map((leg) => {
      const cashflow = (leg.action === "Sell" ? leg.premium : -leg.premium) * leg.qty;
      return `
        <tr>
          <td>${leg.action}</td>
          <td>${leg.type}</td>
          <td>${fmtUsd(leg.strike)}</td>
          <td>${fmtUsd(leg.premium)}</td>
          <td>${leg.qty}</td>
          <td class="${toneClass(cashflow)}">${cashflow >= 0 ? "+" : "-"}${fmtUsd(Math.abs(cashflow))}</td>
        </tr>`;
    }).join("")}</tbody>
  `;
}

function renderPayoff(strategy) {
  if (!window.Plotly) return;
  const t = theme();
  const [min, max] = strategy.range;
  const prices = Array.from({ length: 181 }, (_, index) => min + ((max - min) * index) / 180);
  const payoffs = prices.map((price) => strategyPayoff(strategy, price));
  Plotly.react("payoffChart", [{
    type: "scatter",
    mode: "lines",
    name: "Expiry P/L",
    x: prices,
    y: payoffs,
    line: { color: t.teal, width: 3 },
    hovertemplate: "Underlying %{x:$,.2f}<br>P/L %{y:$,.2f}<extra></extra>",
  }], {
    ...layout("", "P/L per share"),
    xaxis: { title: "Underlying price at expiry", gridcolor: t.grid },
    shapes: [
      { type: "line", xref: "paper", x0: 0, x1: 1, y0: 0, y1: 0, line: { color: t.muted } },
      { type: "line", yref: "paper", y0: 0, y1: 1, x0: strategy.spot, x1: strategy.spot, line: { color: t.maroon, dash: "dot" } },
    ],
  }, plotConfig);

  $("payoffTable").innerHTML = `
    <thead><tr><th>${strategy.underlying} Price at Expiry</th><th>Net P/L per Share</th><th>Net P/L per Contract</th><th>Zone</th></tr></thead>
    <tbody>${strategy.rows.map((price) => {
      const payoff = strategyPayoff(strategy, price);
      const zone = Math.abs(payoff) < 0.5 ? "Breakeven area" : payoff > 0 ? "Profit" : "Loss";
      return `
        <tr>
          <td>${fmtUsd(price)}</td>
          <td class="${toneClass(payoff)}">${payoff >= 0 ? "+" : "-"}${fmtUsd(Math.abs(payoff))}</td>
          <td class="${toneClass(payoff)}">${payoff >= 0 ? "+" : "-"}${fmtUsd(Math.abs(payoff * 100))}</td>
          <td>${zone}</td>
        </tr>`;
    }).join("")}</tbody>
  `;
}

async function fetchLiveQuotes() {
  if (!MARKET_DATA_ENABLED) {
    liveState = {
      loading: false,
      error: "Live Yahoo Finance refresh is disabled on the static Vercel deployment. Run npm run dev locally to use Live Mode.",
      fetchedAt: null,
    };
    renderLiveMode();
    return;
  }
  liveState = { ...liveState, loading: true, error: "" };
  renderLiveMode();
  try {
    const symbols = ETFS.map((row) => row.yahoo).join(",");
    const response = await fetch(`/api/market-data?symbols=${encodeURIComponent(symbols)}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Live quote request failed (${response.status})`);
    const bySymbol = new Map((payload.quotes || []).map((quote) => [String(quote.requestSymbol || quote.symbol || "").toUpperCase(), quote]));
    liveRows = snapshotRows.map((etf) => {
      const quote = bySymbol.get(etf.yahoo.toUpperCase());
      const livePrice = Number(quote?.regularMarketPrice);
      const moveSinceSnapshot = Number.isFinite(livePrice) && etf.periodEndPrice > 0 ? livePrice / etf.periodEndPrice - 1 : NaN;
      return { ...etf, quote, livePrice, moveSinceSnapshot, liveContribution: etf.allocation * moveSinceSnapshot };
    });
    liveState = { loading: false, error: "", fetchedAt: payload.fetchedAt || Math.floor(Date.now() / 1000) };
  } catch (error) {
    liveState = { loading: false, error: error instanceof Error ? error.message : "Live quote request failed.", fetchedAt: null };
  }
  renderLiveMode();
}

function renderLiveMode() {
  const rows = liveRows.length ? liveRows : snapshotRows.map((row) => ({ ...row, livePrice: NaN, moveSinceSnapshot: NaN, liveContribution: NaN }));
  const covered = rows.filter((row) => Number.isFinite(row.livePrice));
  const liveMove = covered.reduce((sum, row) => sum + row.liveContribution, 0);
  const currentValue = CAPITAL * (1 + weightedReturn(snapshotRows)) * (1 + (Number.isFinite(liveMove) ? liveMove : 0));

  $("liveCoverage").textContent = `${covered.length}/${rows.length}`;
  $("livePortfolioValue").textContent = covered.length ? fmtMoney(currentValue) : "--";
  $("livePortfolioMove").textContent = covered.length ? fmtPct(liveMove, true) : "--";
  $("livePortfolioMove").className = toneClass(liveMove);
  $("liveUpdated").textContent = liveState.fetchedAt ? fmtDateTime(liveState.fetchedAt) : "--";
  $("liveStatus").textContent = liveState.loading
    ? "Refreshing live ETF prices from Yahoo Finance..."
    : liveState.error || (covered.length ? `Showing current quotes for ${covered.length}/${rows.length} ETF holdings.` : "Click Refresh Quotes to pull current ETF prices.");

  $("liveQuotesTable").innerHTML = `
    <thead><tr><th>ETF</th><th>Yahoo Symbol</th><th>Name</th><th>Allocation</th><th>17 Apr Price</th><th>Live Price</th><th>Move Since 17 Apr</th><th>Portfolio Impact</th><th>Quote Time</th></tr></thead>
    <tbody>${rows.map((row) => {
      const quoteTime = Number(row.quote?.regularMarketTime);
      return `
        <tr>
          <td>${escapeHtml(row.ticker)}</td>
          <td><a href="https://finance.yahoo.com/quote/${encodeURIComponent(row.yahoo)}" target="_blank" rel="noreferrer">${escapeHtml(row.yahoo)}</a></td>
          <td>${escapeHtml(row.name)}</td>
          <td>${fmtPct(row.allocation)}</td>
          <td>${Number.isFinite(row.periodEndPrice) ? row.periodEndPrice.toFixed(2) : "--"}</td>
          <td>${Number.isFinite(row.livePrice) ? row.livePrice.toFixed(2) : "--"}</td>
          <td class="${toneClass(row.moveSinceSnapshot)}">${fmtPct(row.moveSinceSnapshot, true)}</td>
          <td class="${toneClass(row.liveContribution)}">${fmtPct(row.liveContribution, true)}</td>
          <td>${fmtDateTime(quoteTime)}</td>
        </tr>`;
    }).join("")}</tbody>
  `;
}

function wireEvents() {
  const savedTheme = localStorage.getItem("efm-theme");
  if (savedTheme === "dark") document.body.dataset.theme = "dark";
  $("themeToggle").textContent = isDarkMode() ? "Day mode" : "Night mode";
  $("themeToggle").addEventListener("click", () => {
    document.body.dataset.theme = isDarkMode() ? "" : "dark";
    localStorage.setItem("efm-theme", isDarkMode() ? "dark" : "light");
    $("themeToggle").textContent = isDarkMode() ? "Day mode" : "Night mode";
    renderPortfolio();
    renderOptions();
    renderLiveMode();
  });

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
      button.classList.add("active");
      $("portfolioTab").classList.toggle("hidden", button.dataset.tab !== "portfolio");
      $("optionsTab").classList.toggle("hidden", button.dataset.tab !== "options");
      $("liveTab").classList.toggle("hidden", button.dataset.tab !== "live");
      if (button.dataset.tab === "live" && !liveRows.length && !liveState.loading) fetchLiveQuotes();
      setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
    });
  });

  $("refreshSnapshot").addEventListener("click", fetchSnapshot);
  $("refreshLiveQuotes").addEventListener("click", fetchLiveQuotes);
  $("strategySelect").addEventListener("change", renderOptions);
  if (!MARKET_DATA_ENABLED) {
    $("refreshSnapshot").textContent = "Static Snapshot";
    $("refreshLiveQuotes").textContent = "Local Only";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  $("strategySelect").innerHTML = STRATEGIES.map((strategy) => `<option value="${strategy.id}">${strategy.title}</option>`).join("");
  wireEvents();
  renderPortfolio();
  renderOptions();
  renderLiveMode();
  if (MARKET_DATA_ENABLED) fetchSnapshot();
});
