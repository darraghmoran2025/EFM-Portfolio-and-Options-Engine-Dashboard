from __future__ import annotations

import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import Request, urlopen


YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart"


def _normalise_symbols(raw_symbols: str) -> list[str]:
    symbols: list[str] = []
    seen: set[str] = set()
    for raw in raw_symbols.split(","):
        symbol = raw.strip().upper()
        if not symbol or symbol in seen:
            continue
        seen.add(symbol)
        symbols.append(symbol)
    return symbols[:80]


def _epoch(date_text: str, extra_days: int = 0) -> int | None:
    if not date_text:
        return None
    try:
        parsed = datetime.strptime(date_text, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        return None
    return int((parsed + timedelta(days=extra_days)).timestamp())


def _fetch_yahoo_chart(symbol: str, start: str = "", end: str = "") -> tuple[dict | None, str | None]:
    period1 = _epoch(start)
    period2 = _epoch(end, extra_days=1)
    if period1 and period2:
        query = f"period1={period1}&period2={period2}&interval=1d"
    else:
        query = "range=5d&interval=1d"

    request = Request(
        f"{YAHOO_CHART_URL}/{quote(symbol, safe='.-^')}?{query}",
        headers={
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; EFMPortfolioOptionsDashboard/1.0)",
        },
    )
    try:
        with urlopen(request, timeout=8) as response:
            yahoo_payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        return None, f"{symbol}: {exc}"

    result = yahoo_payload.get("chart", {}).get("result", [])
    if not result:
        return None, f"{symbol}: no chart result"

    item = result[0]
    meta = item.get("meta", {})
    quote_payload = item.get("indicators", {}).get("quote", [{}])[0]
    closes = quote_payload.get("close", []) or []
    timestamps = item.get("timestamp", []) or []
    history = [(ts, float(close)) for ts, close in zip(timestamps, closes) if close is not None]

    live_price = meta.get("regularMarketPrice")
    previous_close = meta.get("chartPreviousClose") or meta.get("previousClose")
    if live_price is None and history:
        live_price = history[-1][1]
    if previous_close is None and len(history) > 1:
        previous_close = history[-2][1]

    payload = {
        "requestSymbol": symbol,
        "symbol": meta.get("symbol") or symbol,
        "currency": meta.get("currency") or "",
        "exchangeName": meta.get("fullExchangeName") or meta.get("exchangeName") or "",
        "regularMarketPrice": float(live_price) if live_price is not None else None,
        "regularMarketPreviousClose": float(previous_close) if previous_close is not None else None,
        "regularMarketTime": meta.get("regularMarketTime"),
        "marketState": meta.get("marketState") or "",
    }

    if period1 and period2 and len(history) >= 2:
        start_ts, start_price = history[0]
        end_ts, end_price = history[-1]
        payload.update(
            {
                "periodStart": start,
                "periodEnd": end,
                "periodStartTime": start_ts,
                "periodEndTime": end_ts,
                "periodStartPrice": start_price,
                "periodEndPrice": end_price,
                "periodReturn": (end_price / start_price - 1.0) if start_price > 0 else None,
            }
        )

    return payload, None


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        symbols = _normalise_symbols(query.get("symbols", [""])[0])
        start = query.get("start", [""])[0]
        end = query.get("end", [""])[0]
        if not symbols:
            self._send_json(400, {"error": "No symbols supplied."})
            return

        quotes: list[dict] = []
        errors: list[str] = []
        with ThreadPoolExecutor(max_workers=min(8, len(symbols))) as executor:
            future_map = {executor.submit(_fetch_yahoo_chart, symbol, start, end): symbol for symbol in symbols}
            for future in as_completed(future_map):
                quote_payload, error = future.result()
                if quote_payload is not None:
                    quotes.append(quote_payload)
                if error:
                    errors.append(error)

        order = {symbol: index for index, symbol in enumerate(symbols)}
        quotes.sort(key=lambda item: order.get(str(item.get("requestSymbol", "")).upper(), len(order)))
        self._send_json(
            200,
            {
                "source": "Yahoo Finance",
                "fetchedAt": int(time.time()),
                "requestedSymbols": symbols,
                "quotes": quotes,
                "errors": errors,
            },
        )

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "private, max-age=30")
        self.end_headers()
        self.wfile.write(body)
