const express = require('express');
const router = express.Router();
const vnd = require('../services/vndirectService');
const { getLastNYears } = require('../utils/dateUtils');

function last5YearRange() {
  const years = getLastNYears(5);
  return {
    startDate: `${years[0]}-01-01`,
    endDate: new Date().toISOString().split('T')[0],
    years,
  };
}

/**
 * GET /api/vnd/:ticker/profile
 * Company profile from VNDirect
 */
router.get('/:ticker/profile', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const data = await vnd.getCompanyProfile(ticker);
    res.json({ source: 'VNDirect', ticker: ticker.toUpperCase(), data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vnd/:ticker/income-statement
 * Query: type=quarterly|yearly (default quarterly), size (default 20)
 */
router.get('/:ticker/income-statement', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const type = req.query.type === 'yearly' ? 'yearly' : 'quarterly';
    const size = Math.min(100, Math.max(1, parseInt(req.query.size) || 20));
    const data = await vnd.getFinancialStatements(ticker, 'income_statement', type, size);
    res.json({ source: 'VNDirect', ticker: ticker.toUpperCase(), type, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vnd/:ticker/balance-sheet
 * Query: type=quarterly|yearly (default quarterly), size (default 20)
 */
router.get('/:ticker/balance-sheet', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const type = req.query.type === 'yearly' ? 'yearly' : 'quarterly';
    const size = Math.min(100, Math.max(1, parseInt(req.query.size) || 20));
    const data = await vnd.getFinancialStatements(ticker, 'balance_sheet', type, size);
    res.json({ source: 'VNDirect', ticker: ticker.toUpperCase(), type, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vnd/:ticker/cash-flow
 * Query: type=quarterly|yearly (default quarterly), size (default 20)
 */
router.get('/:ticker/cash-flow', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const type = req.query.type === 'yearly' ? 'yearly' : 'quarterly';
    const size = Math.min(100, Math.max(1, parseInt(req.query.size) || 20));
    const data = await vnd.getFinancialStatements(ticker, 'cash_flow', type, size);
    res.json({ source: 'VNDirect', ticker: ticker.toUpperCase(), type, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vnd/:ticker/ratios
 * Query: type=quarterly|yearly (default quarterly), size (default 20)
 */
router.get('/:ticker/ratios', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const type = req.query.type === 'yearly' ? 'yearly' : 'quarterly';
    const size = Math.min(100, Math.max(1, parseInt(req.query.size) || 20));
    const data = await vnd.getFinancialRatios(ticker, type, size);
    res.json({ source: 'VNDirect', ticker: ticker.toUpperCase(), type, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vnd/:ticker/price
 * Historical OHLCV price for last 5 years from VNDirect
 * Query: startDate, endDate (optional overrides, YYYY-MM-DD)
 */
router.get('/:ticker/price', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const range = last5YearRange();
    const startDate = req.query.startDate || range.startDate;
    const endDate = req.query.endDate || range.endDate;
    const data = await vnd.getHistoricalPrices(ticker, startDate, endDate);
    res.json({ source: 'VNDirect', ticker: ticker.toUpperCase(), startDate, endDate, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vnd/:ticker/dividends
 * Dividend history from VNDirect
 */
router.get('/:ticker/dividends', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const size = Math.min(100, Math.max(1, parseInt(req.query.size) || 40));
    const data = await vnd.getDividends(ticker, size);
    res.json({ source: 'VNDirect', ticker: ticker.toUpperCase(), data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vnd/:ticker/events
 * Company news & events from VNDirect
 */
router.get('/:ticker/events', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const size = Math.min(100, Math.max(1, parseInt(req.query.size) || 20));
    const data = await vnd.getEvents(ticker, size);
    res.json({ source: 'VNDirect', ticker: ticker.toUpperCase(), data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vnd/:ticker/foreign-trading
 * Foreign buy/sell activity for last 5 years
 * Query: startDate, endDate (optional)
 */
router.get('/:ticker/foreign-trading', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const range = last5YearRange();
    const startDate = req.query.startDate || range.startDate;
    const endDate = req.query.endDate || range.endDate;
    const data = await vnd.getForeignTrading(ticker, startDate, endDate);
    res.json({ source: 'VNDirect', ticker: ticker.toUpperCase(), startDate, endDate, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vnd/:ticker/summary
 * Comprehensive summary from VNDirect (last 5 years)
 * Query: type=quarterly|yearly
 */
router.get('/:ticker/summary', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const type = req.query.type === 'yearly' ? 'yearly' : 'quarterly';
    const size = 20;
    const range = last5YearRange();

    const [
      profile,
      incomeStatement,
      balanceSheet,
      cashFlow,
      ratios,
      price,
      dividends,
      events,
      foreignTrading,
    ] = await Promise.allSettled([
      vnd.getCompanyProfile(ticker),
      vnd.getFinancialStatements(ticker, 'income_statement', type, size),
      vnd.getFinancialStatements(ticker, 'balance_sheet', type, size),
      vnd.getFinancialStatements(ticker, 'cash_flow', type, size),
      vnd.getFinancialRatios(ticker, type, size),
      vnd.getHistoricalPrices(ticker, range.startDate, range.endDate),
      vnd.getDividends(ticker, 40),
      vnd.getEvents(ticker, 20),
      vnd.getForeignTrading(ticker, range.startDate, range.endDate),
    ]);

    const resolve = (r) => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message });

    res.json({
      source: 'VNDirect',
      ticker: ticker.toUpperCase(),
      type,
      periodCoverage: {
        years: range.years,
        startDate: range.startDate,
        endDate: range.endDate,
        description: `Last 5 years (${range.years[0]}–${range.years[range.years.length - 1]})`,
      },
      profile: resolve(profile),
      financials: {
        incomeStatement: resolve(incomeStatement),
        balanceSheet: resolve(balanceSheet),
        cashFlow: resolve(cashFlow),
        ratios: resolve(ratios),
      },
      price: resolve(price),
      dividends: resolve(dividends),
      events: resolve(events),
      foreignTrading: resolve(foreignTrading),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vnd/index/:indexCode/history
 * Market index history (VNINDEX, HNX-INDEX, VN30, etc.)
 * Query: startDate, endDate (optional)
 */
router.get('/index/:indexCode/history', async (req, res, next) => {
  try {
    const { indexCode } = req.params;
    const range = last5YearRange();
    const startDate = req.query.startDate || range.startDate;
    const endDate = req.query.endDate || range.endDate;
    const data = await vnd.getIndexHistory(indexCode.toUpperCase(), startDate, endDate);
    res.json({ source: 'VNDirect', indexCode: indexCode.toUpperCase(), startDate, endDate, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
