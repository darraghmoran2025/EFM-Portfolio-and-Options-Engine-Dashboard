# EFM Portfolio and Options Engine Dashboard

Standalone dashboard for Darragh Moran's EC362 Economics of Financial Markets final assessment.

## What It Includes

- Fixed Q2 ETF portfolio dashboard using the allocation from `Q2 ETF Portfolio.xlsx`.
- YTD performance view for the period ending 17 April 2026.
- Q5 options pricing tab using the project strategy inputs: TSLA and NVDA strategies, strikes, premiums, expiries, implied volatility assumptions and payoff tables.
- Live Mode for current ETF prices using a Yahoo Finance chart proxy.

## Project Structure

- `index.html`, `client.js`, `styles.css`, `assets/`: static Vercel deployment files.
- `api/market-data.js`: Vercel Node function for Yahoo Finance quote/history data.
- `vercel.json`: forces Vercel to treat the repository as a static site.

## Run / Build

Vercel serves the root-level dashboard files through `@vercel/static` and exposes only `/api/market-data` through `@vercel/node`.

For local preview, open `index.html` directly in a browser or serve the folder with any static file server.

The dashboard uses the fixed Q2 workbook snapshot first, then refreshes historical and live ETF prices through `/api/market-data`.
