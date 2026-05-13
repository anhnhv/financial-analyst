const express = require('express');
const router = express.Router();
const vci = require('../services/vciService');
const { getLastNYears } = require('../utils/dateUtils');

function last5YearRange() {
  const years = getLastNYears(5);
  const startDate = `${years[0]}-01-01`;
  const endDate = new Date().toISOString().split('T')[0];
  return { years, startDate, endDate };
}

const resolve = (r) => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message });

/**
 * GET /api/vci/:ticker/overview
 * Basic stock info from the VCI symbol listing.
 */
router.get('/:ticker/overview', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const data = await vci.getStockOverview(ticker);
    res.json({ source: 'VCI', ticker: ticker.toUpperCase(), data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vci/:ticker/income-statement
 * Query: period=quarterly|yearly (default quarterly)
 */
router.get('/:ticker/income-statement', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const period = req.query.period === 'yearly' ? 'yearly' : 'quarterly';
    const lang = req.query.lang === 'vi' ? 'vi' : 'en';
    const data = await vci.getIncomeStatement(ticker, period, lang);
    res.json({ source: 'VCI', ticker: ticker.toUpperCase(), period, lang, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vci/:ticker/balance-sheet
 * Query: period=quarterly|yearly (default quarterly)
 */
router.get('/:ticker/balance-sheet', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const period = req.query.period === 'yearly' ? 'yearly' : 'quarterly';
    const lang = req.query.lang === 'vi' ? 'vi' : 'en';
    const data = await vci.getBalanceSheet(ticker, period, lang);
    res.json({ source: 'VCI', ticker: ticker.toUpperCase(), period, lang, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vci/:ticker/cash-flow
 * Query: period=quarterly|yearly (default quarterly)
 */
router.get('/:ticker/cash-flow', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const period = req.query.period === 'yearly' ? 'yearly' : 'quarterly';
    const lang = req.query.lang === 'vi' ? 'vi' : 'en';
    const data = await vci.getCashFlow(ticker, period, lang);
    res.json({ source: 'VCI', ticker: ticker.toUpperCase(), period, lang, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vci/:ticker/ratios
 * Financial ratios (PE, PB, ROE, ROA, EPS, etc.) — all available periods.
 */
router.get('/:ticker/ratios', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const data = await vci.getFinancialRatios(ticker);
    res.json({ source: 'VCI', ticker: ticker.toUpperCase(), data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vci/:ticker/financials
 * All financial statements combined.
 * Query: period=quarterly|yearly (default quarterly)
 */
router.get('/:ticker/financials', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const period = req.query.period === 'yearly' ? 'yearly' : 'quarterly';
    const lang = req.query.lang === 'vi' ? 'vi' : 'en';
    const range = last5YearRange();

    const [incomeStatement, balanceSheet, cashFlow, ratios] = await Promise.allSettled([
      vci.getIncomeStatement(ticker, period, lang),
      vci.getBalanceSheet(ticker, period, lang),
      vci.getCashFlow(ticker, period, lang),
      vci.getFinancialRatios(ticker),
    ]);

    res.json({
      source: 'VCI',
      ticker: ticker.toUpperCase(),
      period,
      lang,
      periodCoverage: {
        years: range.years,
        description: `Last 5 years (${range.years[0]}–${range.years[range.years.length - 1]})`,
      },
      incomeStatement: resolve(incomeStatement),
      balanceSheet: resolve(balanceSheet),
      cashFlow: resolve(cashFlow),
      financialRatios: resolve(ratios),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vci/:ticker/price
 * Historical OHLCV data.
 * Query: interval=1D|1W|1M (default 1D), startDate, endDate (YYYY-MM-DD, optional)
 */
router.get('/:ticker/price', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const interval = ['1D', '1W', '1M'].includes(req.query.interval) ? req.query.interval : '1D';
    const range = last5YearRange();
    const startDate = req.query.startDate || range.startDate;
    const endDate = req.query.endDate || range.endDate;
    const data = await vci.getHistoricalPrice(ticker, startDate, endDate, interval);
    res.json({
      source: 'VCI',
      ticker: ticker.toUpperCase(),
      interval,
      periodCoverage: { startDate, endDate, years: range.years },
      data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vci/:ticker/intraday
 * Intraday tick-by-tick data.
 * Query: limit (default 100, max 10000), lastTime (epoch seconds, for pagination)
 */
router.get('/:ticker/intraday', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const limit = Math.min(10000, Math.max(1, parseInt(req.query.limit) || 100));
    const lastTime = req.query.lastTime ? parseInt(req.query.lastTime) : null;
    const data = await vci.getIntraday(ticker, limit, lastTime);
    res.json({ source: 'VCI', ticker: ticker.toUpperCase(), limit, lastTime, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vci/:ticker/summary
 * Full summary: overview + all financials + price history.
 * Query: period=quarterly|yearly (default quarterly), interval=1D|1W|1M (default 1D)
 */
router.get('/:ticker/summary', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const period = req.query.period === 'yearly' ? 'yearly' : 'quarterly';
    const lang = req.query.lang === 'vi' ? 'vi' : 'en';
    const interval = ['1D', '1W', '1M'].includes(req.query.interval) ? req.query.interval : '1D';
    const range = last5YearRange();

    const [overview, incomeStatement, balanceSheet, cashFlow, ratios, price] =
      await Promise.allSettled([
        vci.getStockOverview(ticker),
        vci.getIncomeStatement(ticker, period, lang, range.years[0]),
        vci.getBalanceSheet(ticker, period, lang, range.years[0]),
        vci.getCashFlow(ticker, period, lang, range.years[0]),
        vci.getFinancialRatios(ticker, period, range.years[0]),
        vci.getHistoricalPrice(ticker, range.startDate, range.endDate, interval),
      ]);

    res.json({
      source: 'VCI',
      ticker: ticker.toUpperCase(),
      period,
      lang,
      periodCoverage: {
        years: range.years,
        startDate: range.startDate,
        endDate: range.endDate,
        description: `Last 5 years (${range.years[0]}–${range.years[range.years.length - 1]})`,
      },
      overview: resolve(overview),
      financials: {
        incomeStatement: resolve(incomeStatement),
        balanceSheet: resolve(balanceSheet),
        cashFlow: resolve(cashFlow),
        ratios: resolve(ratios),
      },
      // priceHistory: resolve(price),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vci/symbols
 * All listed symbols with exchange and type info.
 */
router.get('/symbols', async (_req, res, next) => {
  try {
    const data = await vci.getAllSymbols();
    res.json({ source: 'VCI', data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vci/symbols/group/:group
 * Symbols in a specific market group.
 * group: VN30 | VN100 | HOSE | HNX | HNX30 | UPCOM | VNMidCap | VNSmallCap | etc.
 */
router.get('/symbols/group/:group', async (req, res, next) => {
  try {
    const { group } = req.params;
    const data = await vci.getSymbolsByGroup(group.toUpperCase());
    res.json({ source: 'VCI', group: group.toUpperCase(), data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vci/sectors
 * ICB industry sector codes and names.
 */
router.get('/sectors', async (_req, res, next) => {
  try {
    const data = await vci.getSectors();
    res.json({ source: 'VCI', data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
