/**
 * TCBS (Techcombank Securities) routes.
 * Mounted at: /api/tcbs/:ticker/...
 *
 * NOTE: These routes require a real TCBS API service implementation.
 * The methods referenced here (getDividendHistory, getShareholders, etc.)
 * are not yet implemented. Create src/services/tcbsApiService.js and update
 * the require below when the TCBS integration is ready.
 */

const express = require('express');
const router = express.Router();
const tcbs = require('../services/tcbsApiService');
const { getLastNYears, validateYearQuarter } = require('../utils/dateUtils');

/**
 * GET /api/tcbs/:ticker/financials
 * Full financial package: income, balance, cashflow, ratios
 * Query: type=quarterly|yearly (default: quarterly)
 */
router.get('/:ticker/financials', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const type = req.query.type === 'yearly' ? 'yearly' : 'quarterly';

    const [incomeStatement, balanceSheet, cashFlow, ratios] = await Promise.allSettled([
      tcbs.getIncomeStatement(ticker, type),
      tcbs.getBalanceSheet(ticker, type),
      tcbs.getCashFlow(ticker, type),
      tcbs.getFinancialRatios(ticker, type),
    ]);

    const years = getLastNYears(5);
    const resolve = (r) => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message });

    res.json({
      source: 'TCBS',
      ticker: ticker.toUpperCase(),
      type,
      periodCoverage: { years, description: `Last 5 years (${years[0]}–${years[years.length - 1]})` },
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
 * GET /api/tcbs/:ticker/income-statement
 * Query: type=quarterly|yearly, year, quarter
 */
router.get('/:ticker/income-statement', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { type = 'quarterly', year, quarter } = req.query;

    if (year) {
      const validation = validateYearQuarter(year, quarter);
      if (!validation.valid) return res.status(400).json({ error: validation.message });
    }

    const data = await tcbs.getIncomeStatement(ticker, type === 'yearly' ? 'yearly' : 'quarterly');
    res.json({ source: 'TCBS', ticker: ticker.toUpperCase(), type, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tcbs/:ticker/balance-sheet
 * Query: type=quarterly|yearly
 */
router.get('/:ticker/balance-sheet', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const type = req.query.type === 'yearly' ? 'yearly' : 'quarterly';
    const data = await tcbs.getBalanceSheet(ticker, type);
    res.json({ source: 'TCBS', ticker: ticker.toUpperCase(), type, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tcbs/:ticker/cash-flow
 * Query: type=quarterly|yearly
 */
router.get('/:ticker/cash-flow', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const type = req.query.type === 'yearly' ? 'yearly' : 'quarterly';
    const data = await tcbs.getCashFlow(ticker, type);
    res.json({ source: 'TCBS', ticker: ticker.toUpperCase(), type, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tcbs/:ticker/ratios
 * Query: type=quarterly|yearly
 */
router.get('/:ticker/ratios', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const type = req.query.type === 'yearly' ? 'yearly' : 'quarterly';
    const data = await tcbs.getFinancialRatios(ticker, type);
    res.json({ source: 'TCBS', ticker: ticker.toUpperCase(), type, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tcbs/:ticker/price
 * Historical OHLCV price data for the last 5 years
 * Query: resolution=1D|1W|1M (default 1D)
 */
router.get('/:ticker/price', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const resolution = ['1D', '1W', '1M'].includes(req.query.resolution) ? req.query.resolution : '1D';
    const years = getLastNYears(5);
    const to = Math.floor(Date.now() / 1000);
    const from = Math.floor(new Date(`${years[0]}-01-01`).getTime() / 1000);
    const data = await tcbs.getHistoricalPrice(ticker, from, to, resolution);
    res.json({
      source: 'TCBS',
      ticker: ticker.toUpperCase(),
      resolution,
      periodCoverage: { from: `${years[0]}-01-01`, to: new Date().toISOString().split('T')[0] },
      data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tcbs/:ticker/dividends
 * Dividend history
 */
router.get('/:ticker/dividends', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const data = await tcbs.getDividendHistory(ticker);
    res.json({ source: 'TCBS', ticker: ticker.toUpperCase(), data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tcbs/:ticker/shareholders
 * Shareholder structure
 */
router.get('/:ticker/shareholders', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const data = await tcbs.getShareholders(ticker);
    res.json({ source: 'TCBS', ticker: ticker.toUpperCase(), data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tcbs/:ticker/insider-transactions
 * Insider buy/sell transactions
 */
router.get('/:ticker/insider-transactions', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const data = await tcbs.getInsiderTransactions(ticker);
    res.json({ source: 'TCBS', ticker: ticker.toUpperCase(), data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tcbs/:ticker/recommendation
 * Analyst recommendations
 */
router.get('/:ticker/recommendation', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const data = await tcbs.getAnalystRecommendation(ticker);
    res.json({ source: 'TCBS', ticker: ticker.toUpperCase(), data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tcbs/:ticker/news
 * Latest company news & events
 * Query: page (default 0), size (default 20)
 */
router.get('/:ticker/news', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const page = Math.max(0, parseInt(req.query.page) || 0);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size) || 20));
    const data = await tcbs.getNews(ticker, page, size);
    res.json({ source: 'TCBS', ticker: ticker.toUpperCase(), page, size, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tcbs/:ticker/summary
 * Comprehensive single-call summary combining all available data for the last 5 years
 * Query: type=quarterly|yearly (default: quarterly)
 */
router.get('/:ticker/summary', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const type = req.query.type === 'yearly' ? 'yearly' : 'quarterly';
    const years = getLastNYears(5);
    const to = Math.floor(Date.now() / 1000);
    const from = Math.floor(new Date(`${years[0]}-01-01`).getTime() / 1000);

    const [
      overview,
      incomeStatement,
      balanceSheet,
      cashFlow,
      ratios,
      price,
      dividends,
      shareholders,
      insiderTx,
      recommendation,
      news,
    ] = await Promise.allSettled([
      tcbs.getStockOverview(ticker),
      tcbs.getIncomeStatement(ticker, type),
      tcbs.getBalanceSheet(ticker, type),
      tcbs.getCashFlow(ticker, type),
      tcbs.getFinancialRatios(ticker, type),
      tcbs.getHistoricalPrice(ticker, from, to, '1D'),
      tcbs.getDividendHistory(ticker),
      tcbs.getShareholders(ticker),
      tcbs.getInsiderTransactions(ticker),
      tcbs.getAnalystRecommendation(ticker),
      tcbs.getNews(ticker, 0, 10),
    ]);

    const resolve = (r) => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message });

    res.json({
      source: 'TCBS',
      ticker: ticker.toUpperCase(),
      type,
      periodCoverage: {
        years,
        description: `Last 5 years (${years[0]}–${years[years.length - 1]})`,
      },
      overview: resolve(overview),
      financials: {
        incomeStatement: resolve(incomeStatement),
        balanceSheet: resolve(balanceSheet),
        cashFlow: resolve(cashFlow),
        ratios: resolve(ratios),
      },
      price: resolve(price),
      dividends: resolve(dividends),
      shareholders: resolve(shareholders),
      insiderTransactions: resolve(insiderTx),
      analystRecommendation: resolve(recommendation),
      latestNews: resolve(news),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
