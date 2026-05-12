/**
 * KB Securities Vietnam (KBS) data service.
 * Base URL: https://kbbuddywts.kbsec.com.vn/iis-server/investment
 *
 * Financial report type codes:
 *   KQKD = Income Statement
 *   CDKT = Balance Sheet
 *   LCTT = Cash Flow Statement
 *   CSTC = Financial Ratios
 *   BCTT = Summary Financial Report
 *
 * termtype: 1 = yearly, 2 = quarterly
 */

const axios = require('axios');

const KBS_IIS = 'https://kbbuddywts.kbsec.com.vn/iis-server/investment';

const kbsClient = axios.create({
  baseURL: KBS_IIS,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  },
});

/** Map user-friendly period string to KBS termtype integer */
function termtype(period) {
  return period === 'yearly' ? 1 : 2;
}

/** Format JS Date to DD-MM-YYYY for KBS API */
function kbsDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

/**
 * Fetch historical OHLCV data from KBS.
 * interval: 1D | 1W | 1M (mapped to day/week/month)
 */
async function getHistoricalPrice(ticker, startDate, endDate, interval = '1D') {
  const intervalMap = { '1D': 'day', '1W': 'week', '1M': 'month', day: 'day', week: 'week', month: 'month' };
  const suffix = intervalMap[interval] || 'day';
  const sdate = kbsDate(startDate);
  const edate = kbsDate(endDate);
  const { data } = await kbsClient.get(`/stocks/${ticker.toUpperCase()}/data_${suffix}`, {
    params: { sdate, edate },
  });
  // Normalize prices (KBS returns prices * 1000)
  if (data && Array.isArray(data[`data_${suffix}`])) {
    data[`data_${suffix}`] = data[`data_${suffix}`].map((bar) => ({
      time: bar.t,
      open: bar.o / 1000,
      high: bar.h / 1000,
      low: bar.l / 1000,
      close: bar.c / 1000,
      volume: bar.v,
      value: bar.va || null,
    }));
  }
  return data;
}

/**
 * Fetch index OHLCV history from KBS.
 * indexCode: VNINDEX | HNXINDEX | UPCOMINDEX | VN30 | HNX30 | VN100
 */
async function getIndexHistory(indexCode, startDate, endDate, interval = '1D') {
  const intervalMap = { '1D': 'day', '1W': 'week', '1M': 'month' };
  const suffix = intervalMap[interval] || 'day';
  const sdate = kbsDate(startDate);
  const edate = kbsDate(endDate);
  const { data } = await kbsClient.get(`/index/${indexCode.toUpperCase()}/data_${suffix}`, {
    params: { sdate, edate },
  });
  return data;
}

/**
 * Fetch company basic info from KBS stock search.
 */
async function getStockOverview(ticker) {
  const { data } = await kbsClient.get('/stock/search/data', {
    params: { keyword: ticker.toUpperCase() },
  });
  const results = Array.isArray(data) ? data : [];
  const match = results.find((s) => s.symbol === ticker.toUpperCase()) || results[0] || null;
  return match;
}

/**
 * Generic financial statement fetch from KBS.
 * reportType: KQKD | CDKT | LCTT | CSTC | BCTT
 * period: 'quarterly' | 'yearly'
 * numPeriods: number of periods to retrieve (max ~20 practical limit)
 */
async function getFinancialStatement(ticker, reportType, period = 'quarterly', numPeriods = 20) {
  const tt = termtype(period);
  const pageSize = 4; // KBS returns max 4 periods per page
  const pages = Math.ceil(numPeriods / pageSize);
  const results = [];

  for (let page = 1; page <= pages; page++) {
    const params = {
      page,
      pageSize,
      type: reportType,
      unit: 1000,
      termtype: tt,
    };
    // Cash flow uses different param name
    if (reportType === 'LCTT') {
      params.termType = tt;
      params.code = ticker.toUpperCase();
      delete params.termtype;
    } else {
      params.languageid = 1;
    }

    const { data } = await kbsClient.get(`/stock/finance-info/${ticker.toUpperCase()}`, { params });

    // Stop if no more data
    const head = data.Head || [];
    if (!head.length) break;
    results.push(data);
    if (head.length < pageSize) break;
  }

  return results;
}

/**
 * Fetch Income Statement (KQKD) from KBS.
 */
async function getIncomeStatement(ticker, period = 'quarterly', numPeriods = 20) {
  return getFinancialStatement(ticker, 'KQKD', period, numPeriods);
}

/**
 * Fetch Balance Sheet (CDKT) from KBS.
 */
async function getBalanceSheet(ticker, period = 'quarterly', numPeriods = 20) {
  return getFinancialStatement(ticker, 'CDKT', period, numPeriods);
}

/**
 * Fetch Cash Flow Statement (LCTT) from KBS.
 */
async function getCashFlow(ticker, period = 'quarterly', numPeriods = 20) {
  return getFinancialStatement(ticker, 'LCTT', period, numPeriods);
}

/**
 * Fetch Financial Ratios (CSTC) from KBS.
 */
async function getFinancialRatios(ticker, period = 'quarterly', numPeriods = 20) {
  return getFinancialStatement(ticker, 'CSTC', period, numPeriods);
}

/**
 * Fetch Summary Financial Report (BCTT) from KBS.
 */
async function getSummaryReport(ticker, period = 'quarterly', numPeriods = 20) {
  return getFinancialStatement(ticker, 'BCTT', period, numPeriods);
}

/**
 * Fetch intraday tick data from KBS.
 */
async function getIntraday(ticker, page = 1, limit = 100) {
  const { data } = await kbsClient.get(`/trade/history/${ticker.toUpperCase()}`, {
    params: { page, limit },
  });
  return data;
}

/**
 * Fetch real-time price board for one or more tickers from KBS.
 * symbols: comma-separated string or array
 */
async function getPriceBoard(symbols) {
  const symbolList = Array.isArray(symbols) ? symbols.join(',') : symbols;
  const { data } = await kbsClient.get('/stock/iss', {
    params: { symbols: symbolList.toUpperCase() },
  });
  return data;
}

/**
 * Fetch sector listing from KBS.
 */
async function getSectors() {
  const { data } = await kbsClient.get('/sector/all');
  return data;
}

/**
 * Fetch all listed symbols from KBS.
 */
async function getAllSymbols(exchange = null) {
  const params = exchange ? { exchange } : {};
  const { data } = await kbsClient.get('/stock/search/data', { params: { keyword: '' , ...params } });
  return data;
}

module.exports = {
  getHistoricalPrice,
  getIndexHistory,
  getStockOverview,
  getFinancialStatement,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getFinancialRatios,
  getSummaryReport,
  getIntraday,
  getPriceBoard,
  getSectors,
  getAllSymbols,
};
