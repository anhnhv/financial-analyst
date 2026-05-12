require('dotenv').config();
const express = require('express');
const cors = require('cors');

const stockRoutes = require('./routes/stockRoutes');
const vndRoutes = require('./routes/vndRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Request logging (lightweight)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * Health check
 * GET /health
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * API reference
 * GET /
 */
app.get('/', (_req, res) => {
  res.json({
    name: 'VN Stock Analysis API',
    version: '1.0.0',
    description: 'Vietnamese stock data API. Source: KBS (KB Securities Vietnam) and VNDirect. All financial endpoints default to last 5 years of quarterly data.',
    sources: {
      KBS: 'https://kbbuddywts.kbsec.com.vn (KB Securities Vietnam)',
      VNDirect: 'https://finfo-api.vndirect.com.vn',
    },
    endpoints: {
      health: 'GET /health',
      kbs: {
        overview: 'GET /api/stock/:ticker/overview',
        summary: 'GET /api/stock/:ticker/summary?period=quarterly|yearly&interval=1D|1W|1M&numPeriods=20',
        financials: 'GET /api/stock/:ticker/financials?period=quarterly|yearly&numPeriods=20',
        incomeStatement: 'GET /api/stock/:ticker/income-statement?period=quarterly|yearly&numPeriods=20',
        balanceSheet: 'GET /api/stock/:ticker/balance-sheet?period=quarterly|yearly&numPeriods=20',
        cashFlow: 'GET /api/stock/:ticker/cash-flow?period=quarterly|yearly&numPeriods=20',
        ratios: 'GET /api/stock/:ticker/ratios?period=quarterly|yearly&numPeriods=20',
        summaryReport: 'GET /api/stock/:ticker/summary-report?period=quarterly|yearly&numPeriods=20',
        price: 'GET /api/stock/:ticker/price?interval=1D|1W|1M&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD',
        intraday: 'GET /api/stock/:ticker/intraday?page=1&limit=100',
        priceBoard: 'GET /api/stock/:ticker/price-board',
        indexPrice: 'GET /api/stock/index/:indexCode/price?interval=1D|1W|1M  (e.g. VNINDEX, HNXINDEX, VN30)',
        sectors: 'GET /api/stock/sectors',
      },
      vndirect: {
        profile: 'GET /api/vnd/:ticker/profile',
        summary: 'GET /api/vnd/:ticker/summary?type=quarterly|yearly',
        incomeStatement: 'GET /api/vnd/:ticker/income-statement?type=quarterly|yearly&size=20',
        balanceSheet: 'GET /api/vnd/:ticker/balance-sheet?type=quarterly|yearly&size=20',
        cashFlow: 'GET /api/vnd/:ticker/cash-flow?type=quarterly|yearly&size=20',
        ratios: 'GET /api/vnd/:ticker/ratios?type=quarterly|yearly&size=20',
        price: 'GET /api/vnd/:ticker/price?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD',
        dividends: 'GET /api/vnd/:ticker/dividends',
        events: 'GET /api/vnd/:ticker/events',
        foreignTrading: 'GET /api/vnd/:ticker/foreign-trading',
        indexHistory: 'GET /api/vnd/index/:indexCode/history  (e.g. VNINDEX, HNX-INDEX, VN30)',
      },
    },
    notes: [
      'Replace :ticker with a VN stock code, e.g. VNM, TCB, HPG, FPT.',
      'All financial endpoints default to quarterly data. Pass ?period=yearly for annual figures.',
      'numPeriods controls how many reporting periods to return (default 20 = ~5 years quarterly).',
      'Period coverage defaults to the last 5 calendar years.',
      'Financial report types: KQKD=Income, CDKT=BalanceSheet, LCTT=CashFlow, CSTC=Ratios, BCTT=Summary.',
    ],
  });
});

// TCBS routes  → /api/stock/:ticker/...
app.use('/api/stock', stockRoutes);

// VNDirect routes → /api/vnd/:ticker/...
app.use('/api/vnd', vndRoutes);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  const status = err.response?.status || 500;
  const message = err.response?.data?.message || err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`VN Stock API running on http://localhost:${PORT}`);
  console.log(`API reference: http://localhost:${PORT}/`);
});
