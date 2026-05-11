# EFM Portfolio and Options Engine Dashboard

Standalone dashboard for Darragh Moran's EC362 Economics of Financial Markets final assessment.

## What It Includes

- Fixed Q2 ETF portfolio dashboard using the allocation from `Q2 ETF Portfolio.xlsx`.
- YTD performance view for the period ending 17 April 2026.
- Q5 options pricing tab using the project strategy inputs: TSLA and NVDA strategies, strikes, premiums, expiries, implied volatility assumptions and payoff tables.
- Local Live Mode for current ETF prices using a Yahoo Finance chart proxy.

## Project Structure

- `static/`: browser dashboard.
- `server.mjs`: local development server with the same `/api/market-data` route.
- `scripts/build-static.mjs`: copies `static/` to `dist/`.

## Run / Build

```powershell
npm run build
```

The static build is written to `dist/`.

For a backend-enabled local preview:

```powershell
npm run dev
```

Then open `http://localhost:5177`.

The Vercel deployment is intentionally static to avoid serverless runtime failures. It uses the fixed Q2 workbook snapshot. The historical refresh and Live Mode are available when running the local dev server.
