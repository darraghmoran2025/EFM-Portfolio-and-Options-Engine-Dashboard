# EFM Portfolio and Options Engine Dashboard

Standalone dashboard for Darragh Moran's EC362 Economics of Financial Markets final assessment.

## What It Includes

- Fixed Q2 ETF portfolio dashboard using the allocation from `Q2 ETF Portfolio.xlsx`.
- YTD performance view for the period ending 17 April 2026.
- Q5 options pricing tab using the project strategy inputs: TSLA and NVDA strategies, strikes, premiums, expiries, implied volatility assumptions and payoff tables.
- Local Live Mode for current ETF prices using a Yahoo Finance chart proxy.

## Project Structure

- `index.html`, `client.js`, `styles.css`, `assets/`: static Vercel deployment files.
- `vercel.json`: forces Vercel to treat the repository as a static site.

## Run / Build

Vercel serves the root-level static files directly through `@vercel/static`. No serverless function is required for deployment.

For local preview, open `index.html` directly in a browser or serve the folder with any static file server.

The Vercel deployment is intentionally static to avoid serverless runtime failures. It uses the fixed Q2 workbook snapshot.
