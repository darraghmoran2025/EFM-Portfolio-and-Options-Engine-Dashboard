from __future__ import annotations

import json
import mimetypes
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
DIST_ROOT = ROOT / "dist"
STATIC_ROOT = ROOT / "static"
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart"
QUOTE_CACHE_TTL_SECONDS = 60
_quote_cache: dict[str, tuple[float, bytes]] = {}


def _asset_root() -> Path:
    return DIST_ROOT if DIST_ROOT.exists() else STATIC_ROOT


def _resolve_path(request_path: str) -> Path:
    root = _asset_root()
    clean_path = unquote(request_path.split("?", 1)[0]).lstrip("/")
    if not clean_path:
        return root / "index.html"

    candidate = (root / clean_path).resolve()
    try:
        candidate.relative_to(root.resolve())
    except ValueError:
        return root / "index.html"

    if candidate.is_file():
        return candidate
    return root / "index.html"


def _json_response(status: int, payload: dict) -> tuple[int, list[tuple[bytes, bytes]], bytes]:
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return status, [
        (b"content-type", b"application/json; charset=utf-8"),
        (b"cache-control", b"private, max-age=30"),
    ], body


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
    query = f"period1={period1}&period2={period2}&interval=1d" if period1 and period2 else "range=5d&interval=1d"
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
    closes = item.get("indicators", {}).get("quote", [{}])[0].get("close", []) or []
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


def _market_data(symbols: list[str], start: str, end: str) -> tuple[int, list[tuple[bytes, bytes]], bytes]:
    if not symbols:
        return _json_response(400, {"error": "No symbols supplied."})

    cache_key = ",".join(symbols) + f"|{start}|{end}"
    cached = _quote_cache.get(cache_key)
    now = time.time()
    if cached and now - cached[0] < QUOTE_CACHE_TTL_SECONDS:
        return 200, [
            (b"content-type", b"application/json; charset=utf-8"),
            (b"cache-control", b"private, max-age=30"),
            (b"x-cache", b"HIT"),
        ], cached[1]

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
    body = json.dumps(
        {
            "source": "Yahoo Finance",
            "fetchedAt": int(now),
            "requestedSymbols": symbols,
            "quotes": quotes,
            "errors": errors,
        },
        separators=(",", ":"),
    ).encode("utf-8")
    _quote_cache[cache_key] = (now, body)
    return 200, [
        (b"content-type", b"application/json; charset=utf-8"),
        (b"cache-control", b"private, max-age=30"),
        (b"x-cache", b"MISS"),
    ], body


async def app(scope, receive, send):
    if scope["type"] != "http":
        return

    path = scope.get("path", "/")
    if path == "/api/market-data":
        query = parse_qs(scope.get("query_string", b"").decode("utf-8"))
        symbols = _normalise_symbols(query.get("symbols", [""])[0])
        status, headers, body = _market_data(symbols, query.get("start", [""])[0], query.get("end", [""])[0])
        await send({"type": "http.response.start", "status": status, "headers": headers})
        await send({"type": "http.response.body", "body": body})
        return

    target = _resolve_path(path)
    if not target.is_file():
        await send({"type": "http.response.start", "status": 404, "headers": [(b"content-type", b"text/plain; charset=utf-8")]})
        await send({"type": "http.response.body", "body": b"Not found"})
        return

    content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
    await send({
        "type": "http.response.start",
        "status": 200,
        "headers": [
            (b"content-type", content_type.encode("utf-8")),
            (b"cache-control", b"public, max-age=0, must-revalidate"),
        ],
    })
    await send({"type": "http.response.body", "body": target.read_bytes()})
