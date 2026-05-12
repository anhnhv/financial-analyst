const express = require('express');
const router = express.Router();
const kbs = require('../services/tcbsService');
const { getLastNYears, validateYearQuarter } = require('../utils/dateUtils');

function last5YearRange() {
  const years = getLastNYears(5);
  const startDate = `${years[0]}-01-01`;
  const endDate = new Date().toISOString().split('T')[0];
  return { years, startDate, endDate };
}

/**
 * GET /api/stock/:ticker/overview
 * Basic stock search info (name, exchange, ref price, ceiling, floor)
 */
router.get('/:ticker/overview', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const data = await kbs.getStockOverview(ticker);
    res.json({ source: 'KBS', ticker: ticker.toUpperCase(), data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stock/:ticker/price
 * Historical OHLCV for last 5 years
 * Query: interval=1D|1W|1M (default 1D), startDate, endDate (YYYY-MM-DD, optional)
 */
router.get('/:ticker/price', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const interval = ['1D', '1W', '1M'].includes(req.query.interval) ? req.query.interval : '1D';
    const range = last5YearRange();
    const startDate = req.query.startDate || range.startDate;
    const endDate = req.query.endDate || range.endDate;
    const data = await kbs.getHistoricalPrice(ticker, startDate, endDate, interval);
    res.json({
      source: 'KBS',
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
 * GET /api/stock/:ticker/income-statement
 * Income Statement (KQKD) – last 5 years
 * Query: period=quarterly|yearly (default quarterly), numPeriods (default 20)
 */
router.get('/:ticker/income-statement', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const period = req.query.period === 'yearly' ? 'yearly' : 'quarterly';
    const numPeriods = Math.min(80, Math.max(1, parseInt(req.query.numPeriods) || 20));
    const data = await kbs.getIncomeStatement(ticker, period, numPeriods);
    res.json({ source: 'KBS', ticker: ticker.toUpperCase(), period, numPeriods, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stock/:ticker/balance-sheet
 * Balance Sheet (CDKT) – last 5 years
 * Query: period=quarterly|yearly (default quarterly), numPeriods (default 20)
 */
router.get('/:ticker/balance-sheet', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const period = req.query.period === 'yearly' ? 'yearly' : 'quarterly';
    const numPeriods = Math.min(80, Math.max(1, parseInt(req.query.numPeriods) || 20));
    const data = await kbs.getBalanceSheet(ticker, period, numPeriods);
    res.json({ source: 'KBS', ticker: ticker.toUpperCase(), period, numPeriods, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stock/:ticker/cash-flow
 * Cash Flow Statement (LCTT) – last 5 years
 * Query: period=quarterly|yearly (default quarterly), numPeriods (default 20)
 */
router.get('/:ticker/cash-flow', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const period = req.query.period === 'yearly' ? 'yearly' : 'quarterly';
    const numPeriods = Math.min(80, Math.max(1, parseInt(req.query.numPeriods) || 20));
    const data = await kbs.getCashFlow(ticker, period, numPeriods);
    res.json({ source: 'KBS', ticker: ticker.toUpperCase(), period, numPeriods, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stock/:ticker/ratios
 * Financial Ratios (CSTC) – last 5 years
 * Query: period=quarterly|yearly (default quarterly), numPeriods (default 20)
 */
router.get('/:ticker/ratios', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const period = req.query.period === 'yearly' ? 'yearly' : 'quarterly';
    const numPeriods = Math.min(80, Math.max(1, parseInt(req.query.numPeriods) || 20));
    const data = await kbs.getFinancialRatios(ticker, period, numPeriods);
    res.json({ source: 'KBS', ticker: ticker.toUpperCase(), period, numPeriods, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stock/:ticker/summary-report
 * Summary Financial Report (BCTT) – last 5 years
 * Query: period=quarterly|yearly (default quarterly), numPeriods (default 20)
 */
router.get('/:ticker/summary-report', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const period = req.query.period === 'yearly' ? 'yearly' : 'quarterly';
    const numPeriods = Math.min(80, Math.max(1, parseInt(req.query.numPeriods) || 20));
    const data = await kbs.getSummaryReport(ticker, period, numPeriods);
    res.json({ source: 'KBS', ticker: ticker.toUpperCase(), period, numPeriods, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stock/:ticker/financials
 * Comprehensive financial package: income, balance, cashflow, ratios
 * Query: period=quarterly|yearly (default quarterly), numPeriods (default 20)
 */
router.get('/:ticker/financials', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const period = req.query.period === 'yearly' ? 'yearly' : 'quarterly';
    const numPeriods = Math.min(80, Math.max(1, parseInt(req.query.numPeriods) || 20));
    const range = last5YearRange();

    const [incomeStatement, balanceSheet, cashFlow, ratios, summaryReport] = await Promise.allSettled([
      kbs.getIncomeStatement(ticker, period, numPeriods),
      kbs.getBalanceSheet(ticker, period, numPeriods),
      kbs.getCashFlow(ticker, period, numPeriods),
      kbs.getFinancialRatios(ticker, period, numPeriods),
      kbs.getSummaryReport(ticker, period, numPeriods),
    ]);

    const resolve = (r) => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message });

    res.json({
      source: 'KBS',
      ticker: ticker.toUpperCase(),
      period,
      numPeriods,
      periodCoverage: {
        years: range.years,
        description: `Last 5 years (${range.years[0]}–${range.years[range.years.length - 1]})`,
      },
      incomeStatement: resolve(incomeStatement),
      balanceSheet: resolve(balanceSheet),
      cashFlow: resolve(cashFlow),
      financialRatios: resolve(ratios),
      summaryReport: resolve(summaryReport),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stock/:ticker/intraday
 * Intraday tick-by-tick trade data (today)
 * Query: page (default 1), limit (default 100, max 10000)
 */
router.get('/:ticker/intraday', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(10000, Math.max(1, parseInt(req.query.limit) || 100));
    const data = await kbs.getIntraday(ticker, page, limit);
    res.json({ source: 'KBS', ticker: ticker.toUpperCase(), page, limit, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stock/:ticker/price-board
 * Real-time price board (bid/ask, foreign flow, volume etc.)
 */
router.get('/:ticker/price-board', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const data = await kbs.getPriceBoard(ticker);
    res.json({ source: 'KBS', ticker: ticker.toUpperCase(), data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stock/:ticker/summary
 * Full summary for a ticker: overview + all financials + 5-year price history
 * Query: period=quarterly|yearly (default quarterly), interval=1D|1W|1M (default 1D)
 */
router.get('/:ticker/summary', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const period = req.query.period === 'yearly' ? 'yearly' : 'quarterly';
    const numPeriods = Math.min(80, Math.max(1, parseInt(req.query.numPeriods) || 20));
    const interval = ['1D', '1W', '1M'].includes(req.query.interval) ? req.query.interval : '1D';
    const range = last5YearRange();

    const [
      overview,
      incomeStatement,
      balanceSheet,
      cashFlow,
      ratios,
      summaryReport,
      price,
      priceBoard,
    ] = await Promise.allSettled([
      kbs.getStockOverview(ticker),
      kbs.getIncomeStatement(ticker, period, numPeriods),
      kbs.getBalanceSheet(ticker, period, numPeriods),
      kbs.getCashFlow(ticker, period, numPeriods),
      kbs.getFinancialRatios(ticker, period, numPeriods),
      kbs.getSummaryReport(ticker, period, numPeriods),
      kbs.getHistoricalPrice(ticker, range.startDate, range.endDate, interval),
      kbs.getPriceBoard(ticker),
    ]);

    const resolve = (r) => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message });

    res.json({
      source: 'KBS',
      ticker: ticker.toUpperCase(),
      period,
      numPeriods,
      periodCoverage: {
        years: range.years,
        startDate: range.startDate,
        endDate: range.endDate,
        description: `Last 5 years (${range.years[0]}–${range.years[range.years.length - 1]})`,
      },
      overview: resolve(overview),
      priceBoard: resolve(priceBoard),
      financials: {
        incomeStatement: resolve(incomeStatement),
        balanceSheet: resolve(balanceSheet),
        cashFlow: resolve(cashFlow),
        ratios: resolve(ratios),
        summaryReport: resolve(summaryReport),
      },
      priceHistory: resolve(price),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stock/index/:indexCode/price
 * Index OHLCV history (VNINDEX, HNXINDEX, UPCOMINDEX, VN30, HNX30, VN100)
 * Query: interval=1D|1W|1M, startDate, endDate
 */
router.get('/index/:indexCode/price', async (req, res, next) => {
  try {
    const { indexCode } = req.params;
    const interval = ['1D', '1W', '1M'].includes(req.query.interval) ? req.query.interval : '1D';
    const range = last5YearRange();
    const startDate = req.query.startDate || range.startDate;
    const endDate = req.query.endDate || range.endDate;
    const data = await kbs.getIndexHistory(indexCode, startDate, endDate, interval);
    res.json({
      source: 'KBS',
      indexCode: indexCode.toUpperCase(),
      interval,
      startDate,
      endDate,
      data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stock/sectors
 * All market sectors from KBS
 */
router.get('/sectors', async (_req, res, next) => {
  try {
    const data = await kbs.getSectors();
    res.json({ source: 'KBS', data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

/**
 * GET /api/stock/:ticker/financials
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

    res.json({
      source: 'TCBS',
      ticker: ticker.toUpperCase(),
      type,
      periodCoverage: { years, description: `Last 5 years (${years[0]}–${years[years.length - 1]})` },
      incomeStatement: incomeStatement.status === 'fulfilled' ? incomeStatement.value : { error: incomeStatement.reason?.message },
      balanceSheet: balanceSheet.status === 'fulfilled' ? balanceSheet.value : { error: balanceSheet.reason?.message },
      cashFlow: cashFlow.status === 'fulfilled' ? cashFlow.value : { error: cashFlow.reason?.message },
      financialRatios: ratios.status === 'fulfilled' ? ratios.value : { error: ratios.reason?.message },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stock/:ticker/income-statement
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
 * GET /api/stock/:ticker/balance-sheet
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
 * GET /api/stock/:ticker/cash-flow
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
 * GET /api/stock/:ticker/ratios
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
 * GET /api/stock/:ticker/price
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
 * GET /api/stock/:ticker/dividends
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
 * GET /api/stock/:ticker/shareholders
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
 * GET /api/stock/:ticker/insider-transactions
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
 * GET /api/stock/:ticker/recommendation
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
 * GET /api/stock/:ticker/news
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
 * GET /api/stock/:ticker/summary
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
