# VN Stock Analysis API

Running on `http://localhost:3000` (Node.js v25, Express).

## Data Sources

| Source | Base URL | Used For |
|---|---|---|
| **KBS** (KB Securities Vietnam) | `kbbuddywts.kbsec.com.vn` | Prices, financials, real-time board |
| **VNDirect** | `finfo-api.vndirect.com.vn` | Cross-reference data |

## KBS Endpoints (`/api/stock`)

| Endpoint | Description |
|---|---|
| `GET /api/stock/:ticker/overview` | Name, exchange, ref/ceiling/floor price |
| `GET /api/stock/:ticker/summary` | Everything in one call |
| `GET /api/stock/:ticker/financials` | All 5 statement types combined |
| `GET /api/stock/:ticker/income-statement` | KQKD – Revenue, profit, EPS |
| `GET /api/stock/:ticker/balance-sheet` | CDKT – Assets, liabilities, equity |
| `GET /api/stock/:ticker/cash-flow` | LCTT – Operating/investing/financing |
| `GET /api/stock/:ticker/ratios` | CSTC – PE, PB, ROE, ROA, margins |
| `GET /api/stock/:ticker/summary-report` | BCTT – Management summary |
| `GET /api/stock/:ticker/price` | OHLCV history (5 years, daily by default) |
| `GET /api/stock/:ticker/intraday` | Tick-by-tick trades (today) |
| `GET /api/stock/:ticker/price-board` | Real-time bid/ask, foreign flow |
| `GET /api/stock/index/:indexCode/price` | VNINDEX, HNXINDEX, VN30 history |
| `GET /api/stock/sectors` | All 25 market sectors |

## VNDirect Endpoints (`/api/vnd`)

| Endpoint | Description |
|---|---|
| `GET /api/vnd/:ticker/profile` | Company profile |
| `GET /api/vnd/:ticker/income-statement` | Income statement |
| `GET /api/vnd/:ticker/balance-sheet` | Balance sheet |
| `GET /api/vnd/:ticker/cash-flow` | Cash flow statement |
| `GET /api/vnd/:ticker/ratios` | Financial ratios |
| `GET /api/vnd/:ticker/price` | Price history |
| `GET /api/vnd/:ticker/dividends` | Dividend history |
| `GET /api/vnd/:ticker/events` | Corporate events |
| `GET /api/vnd/:ticker/foreign-trading` | Foreign buy/sell flow |
| `GET /api/vnd/:ticker/summary` | Full summary |
| `GET /api/vnd/index/:indexCode/history` | Index history |

## Query Parameters

| Parameter | Values | Default | Description |
|---|---|---|---|
| `period` | `quarterly`, `yearly` | `quarterly` | Financial reporting period |
| `numPeriods` | integer | `20` | Number of reporting periods (~5 years quarterly) |
| `interval` | `1D`, `1W`, `1M` | `1D` | Price bar interval |
| `startDate` | `YYYY-MM-DD` | 5 years ago | Start of date range |
| `endDate` | `YYYY-MM-DD` | today | End of date range |

## Financial Report Type Codes (KBS)

| Code | Report |
|---|---|
| `KQKD` | Income Statement |
| `CDKT` | Balance Sheet |
| `LCTT` | Cash Flow Statement |
| `CSTC` | Financial Ratios |
| `BCTT` | Summary Report |

## Getting Started

### Prerequisites

- Node.js v25 (via nvm)

### Install & Run

```bash
# Activate Node 25
source ~/.nvm/nvm.sh && nvm use 25

# Install dependencies
npm install

# Start server (production)
npm start

# Start server with auto-reload
npm run dev
```

### Environment Variables (`.env`)

```
PORT=3000
SSI_API_KEY=
SSI_SECRET_KEY=
```

## Example Requests

```bash
# Health check
curl http://localhost:3000/health

# Stock overview
curl "http://localhost:3000/api/stock/VNM/overview"

# 5-year daily price history
curl "http://localhost:3000/api/stock/VNM/price"

# Weekly prices
curl "http://localhost:3000/api/stock/VNM/price?interval=1W"

# Last 20 quarters of income statement
curl "http://localhost:3000/api/stock/VNM/income-statement?period=quarterly&numPeriods=20"

# Yearly balance sheet (5 years)
curl "http://localhost:3000/api/stock/VNM/balance-sheet?period=yearly&numPeriods=5"

# All financials in one call
curl "http://localhost:3000/api/stock/VNM/financials"

# Full summary (price + all financials + overview)
curl "http://localhost:3000/api/stock/VNM/summary"

# VNINDEX weekly history
curl "http://localhost:3000/api/stock/index/VNINDEX/price?interval=1W"

# Real-time price board
curl "http://localhost:3000/api/stock/VNM/price-board"

# All market sectors
curl "http://localhost:3000/api/stock/sectors"
```

## Notes

- KBS returns prices multiplied by 1000 — the API normalizes them (e.g., `60600` → `60.6` thousand VND = `60,600` VND).
- Financial data covers the last 5 years by default (approximately 20 quarterly or 5 yearly periods).
- VNDirect connectivity depends on network access to `finfo-api.vndirect.com.vn`.
