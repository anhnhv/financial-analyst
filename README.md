# VN Stock Analysis API

Running on `http://localhost:3000` (Node.js v25, Express).

## Data Sources

| Source | Base URL | Used For |
|---|---|---|
| **KBS** (KB Securities Vietnam) | `kbbuddywts.kbsec.com.vn` | Prices, financials, real-time board |
| **TCBS** (Techcombank Securities) | `apipubaws.tcbs.com.vn` | Financials, dividends, shareholders, news |
| **VCI** (Viet Capital Securities) | `iq.vietcap.com.vn` / `trading.vietcap.com.vn` | Financials, prices, intraday, sectors |
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

## TCBS Endpoints (`/api/tcbs`)

| Endpoint | Description |
|---|---|
| `GET /api/tcbs/:ticker/overview` | Company profile |
| `GET /api/tcbs/:ticker/summary` | Full summary in one call |
| `GET /api/tcbs/:ticker/financials` | Income, balance, cashflow, ratios combined |
| `GET /api/tcbs/:ticker/income-statement` | Revenue, profit, EPS |
| `GET /api/tcbs/:ticker/balance-sheet` | Assets, liabilities, equity |
| `GET /api/tcbs/:ticker/cash-flow` | Operating/investing/financing cash flows |
| `GET /api/tcbs/:ticker/ratios` | PE, PB, ROE, ROA, margins |
| `GET /api/tcbs/:ticker/price` | OHLCV history (5 years, daily by default) |
| `GET /api/tcbs/:ticker/dividends` | Dividend history |
| `GET /api/tcbs/:ticker/shareholders` | Major shareholders |
| `GET /api/tcbs/:ticker/insider-transactions` | Insider dealing transactions |
| `GET /api/tcbs/:ticker/recommendation` | Analyst recommendations |
| `GET /api/tcbs/:ticker/news` | Latest company news |

## VCI Endpoints (`/api/vci`)

| Endpoint | Description |
|---|---|
| `GET /api/vci/:ticker/overview` | Symbol info (exchange, type, name) |
| `GET /api/vci/:ticker/summary` | Full summary in one call |
| `GET /api/vci/:ticker/financials` | Income, balance, cashflow, ratios combined |
| `GET /api/vci/:ticker/income-statement` | Revenue, profit, EPS |
| `GET /api/vci/:ticker/balance-sheet` | Assets, liabilities, equity |
| `GET /api/vci/:ticker/cash-flow` | Operating/investing/financing cash flows |
| `GET /api/vci/:ticker/ratios` | PE, PB, ROE, ROA, dividend yield, market cap |
| `GET /api/vci/:ticker/price` | OHLCV history (5 years, daily by default) |
| `GET /api/vci/:ticker/intraday` | Intraday tick data |
| `GET /api/vci/symbols` | All listed symbols with exchange and type |
| `GET /api/vci/symbols/group/:group` | Symbols by group (VN30, HNX30, UPCOM, etc.) |
| `GET /api/vci/sectors` | ICB industry sector codes |

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

### KBS (`/api/stock`)

| Parameter | Values | Default | Description |
|---|---|---|---|
| `period` | `quarterly`, `yearly` | `quarterly` | Financial reporting period |
| `numPeriods` | integer | `20` | Number of reporting periods (~5 years quarterly) |
| `interval` | `1D`, `1W`, `1M` | `1D` | Price bar interval |
| `startDate` | `YYYY-MM-DD` | 5 years ago | Start of date range |
| `endDate` | `YYYY-MM-DD` | today | End of date range |

### TCBS (`/api/tcbs`)

| Parameter | Values | Default | Description |
|---|---|---|---|
| `type` | `quarterly`, `yearly` | `quarterly` | Financial reporting period |
| `resolution` | `1D`, `1W`, `1M` | `1D` | Price bar interval |
| `page` | integer | `0` | Page index for paginated results |
| `size` | integer | `20` | Page size for paginated results |

### VCI (`/api/vci`)

| Parameter | Values | Default | Description |
|---|---|---|---|
| `period` | `quarterly`, `yearly` | `quarterly` | Financial reporting period |
| `interval` | `1D`, `1W`, `1M` | `1D` | Price bar interval |
| `startDate` | `YYYY-MM-DD` | 5 years ago | Start of price date range |
| `endDate` | `YYYY-MM-DD` | today | End of price date range |
| `limit` | integer | `100` | Intraday tick count (max 10000) |
| `lastTime` | epoch seconds | — | Intraday pagination cursor |

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

# ── KBS ──────────────────────────────────────────────────────────────────────

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

# ── TCBS ─────────────────────────────────────────────────────────────────────

# Company overview
curl "http://localhost:3000/api/tcbs/VNM/overview"

# All financials in one call (quarterly)
curl "http://localhost:3000/api/tcbs/VNM/financials"

# Yearly income statement
curl "http://localhost:3000/api/tcbs/VNM/income-statement?type=yearly"

# 5-year daily price history
curl "http://localhost:3000/api/tcbs/VNM/price"

# Dividend history
curl "http://localhost:3000/api/tcbs/VNM/dividends"

# Major shareholders
curl "http://localhost:3000/api/tcbs/VNM/shareholders"

# Insider transactions
curl "http://localhost:3000/api/tcbs/VNM/insider-transactions"

# Analyst recommendations
curl "http://localhost:3000/api/tcbs/VNM/recommendation"

# Latest news
curl "http://localhost:3000/api/tcbs/VNM/news"

# ── VCI ─────────────────────────────────────────────────────────────────────

# Company overview
curl "http://localhost:3000/api/vci/VNM/overview"

# All financials (quarterly)
curl "http://localhost:3000/api/vci/VNM/financials"

# Yearly income statement
curl "http://localhost:3000/api/vci/VNM/income-statement?period=yearly"

# 5-year daily price history
curl "http://localhost:3000/api/vci/VNM/price"

# Financial ratios
curl "http://localhost:3000/api/vci/VNM/ratios"

# Intraday ticks
curl "http://localhost:3000/api/vci/VNM/intraday"

# Full summary
curl "http://localhost:3000/api/vci/VNM/summary"

# All symbols
curl "http://localhost:3000/api/vci/symbols"

# VN30 constituents
curl "http://localhost:3000/api/vci/symbols/group/VN30"

# ICB sectors
curl "http://localhost:3000/api/vci/sectors"
```

## Fetch Script (`scripts/fetch.js`)

Requires the API server to be running (`npm start`). Saves results to `output/<TICKER>.json` and `output/sectors.json`.

```bash
# One or more tickers
node scripts/fetch.js VNM FPT VIC

# Via npm
npm run fetch -- VNM FPT
```

Each output file contains: overview, income statement, balance sheet, cash flow, and financial ratios (last 20 quarterly periods).

---

## Notes

- KBS returns prices multiplied by 1000 — the API normalizes them (e.g., `60600` → `60.6` thousand VND = `60,600` VND).
- Financial data covers the last 5 years by default (approximately 20 quarterly or 5 yearly periods).
- VNDirect connectivity depends on network access to `finfo-api.vndirect.com.vn`.
