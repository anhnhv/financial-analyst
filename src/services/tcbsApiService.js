/**
 * TCBS (Techcombank Securities) public data service.
 * Base URL: https://apipubaws.tcbs.com.vn
 *
 * Financial report endpoints (tcanalysis):
 *   incomestatement  = Income Statement
 *   balancesheet     = Balance Sheet
 *   cashflow         = Cash Flow Statement
 *   financialratio   = Financial Ratios
 *
 * period param: 'quarter' | 'year'
 */

const axios = require('axios');

const TCBS_ANALYSIS = 'https://apipubaws.tcbs.com.vn/tcanalysis/v1';
const TCBS_INSIGHT  = 'https://apipubaws.tcbs.com.vn/stock-insight/v1';

const tcbsClient = axios.create({
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  },
});

/** Map 'quarterly'|'yearly' → TCBS period string */
function tcbsPeriod(type) {
  return type === 'yearly' ? 'year' : 'quarter';
}

/** Map resolution string to TCBS format */
function tcbsResolution(resolution) {
  const map = { '1D': 'D', '1W': 'W', '1M': 'M', D: 'D', W: 'W', M: 'M' };
  return map[resolution] || 'D';
}

/**
 * Fetch company overview/profile.
 */
async function getStockOverview(ticker) {
  const { data } = await tcbsClient.get(
    `${TCBS_ANALYSIS}/company/${ticker.toUpperCase()}/overview`,
  );
  return data;
}

/**
 * Fetch Income Statement.
 * type: 'quarterly' | 'yearly'
 */
async function getIncomeStatement(ticker, type = 'quarterly') {
  const { data } = await tcbsClient.get(
    `${TCBS_ANALYSIS}/finance/${ticker.toUpperCase()}/incomestatement`,
    { params: { period: tcbsPeriod(type), issuer: 'COMP' } },
  );
  return data;
}

/**
 * Fetch Balance Sheet.
 * type: 'quarterly' | 'yearly'
 */
async function getBalanceSheet(ticker, type = 'quarterly') {
  const { data } = await tcbsClient.get(
    `${TCBS_ANALYSIS}/finance/${ticker.toUpperCase()}/balancesheet`,
    { params: { period: tcbsPeriod(type), issuer: 'COMP' } },
  );
  return data;
}

/**
 * Fetch Cash Flow Statement.
 * type: 'quarterly' | 'yearly'
 */
async function getCashFlow(ticker, type = 'quarterly') {
  const { data } = await tcbsClient.get(
    `${TCBS_ANALYSIS}/finance/${ticker.toUpperCase()}/cashflow`,
    { params: { period: tcbsPeriod(type), issuer: 'COMP' } },
  );
  return data;
}

/**
 * Fetch Financial Ratios.
 * type: 'quarterly' | 'yearly'
 */
async function getFinancialRatios(ticker, type = 'quarterly') {
  const { data } = await tcbsClient.get(
    `${TCBS_ANALYSIS}/finance/${ticker.toUpperCase()}/financialratio`,
    { params: { period: tcbsPeriod(type), issuer: 'COMP' } },
  );
  return data;
}

/**
 * Fetch historical OHLCV data.
 * from / to: Unix timestamps (seconds)
 * resolution: '1D' | '1W' | '1M'
 */
async function getHistoricalPrice(ticker, from, to, resolution = '1D') {
  const { data } = await tcbsClient.get(
    `${TCBS_INSIGHT}/stock/bars-long-term`,
    {
      params: {
        ticker: ticker.toUpperCase(),
        type: 'stock',
        resolution: tcbsResolution(resolution),
        from,
        to,
      },
    },
  );
  return data;
}

/**
 * Fetch dividend history.
 */
async function getDividendHistory(ticker, page = 0, size = 100) {
  const { data } = await tcbsClient.get(
    `${TCBS_ANALYSIS}/company/${ticker.toUpperCase()}/dividends`,
    { params: { page, size } },
  );
  return data;
}

/**
 * Fetch major/large shareholders.
 */
async function getShareholders(ticker) {
  const { data } = await tcbsClient.get(
    `${TCBS_ANALYSIS}/company/${ticker.toUpperCase()}/large-shareholders`,
  );
  return data;
}

/**
 * Fetch insider dealing transactions.
 */
async function getInsiderTransactions(ticker, page = 0, size = 20) {
  const { data } = await tcbsClient.get(
    `${TCBS_ANALYSIS}/company/${ticker.toUpperCase()}/insider-dealing`,
    { params: { page, size } },
  );
  return data;
}

/**
 * Fetch analyst recommendations.
 */
async function getAnalystRecommendation(ticker) {
  const { data } = await tcbsClient.get(
    `${TCBS_ANALYSIS}/company/${ticker.toUpperCase()}/recommendation`,
  );
  return data;
}

/**
 * Fetch latest company news.
 */
async function getNews(ticker, page = 0, size = 20) {
  const { data } = await tcbsClient.get(
    `${TCBS_ANALYSIS}/company/${ticker.toUpperCase()}/news`,
    { params: { page, size } },
  );
  return data;
}

module.exports = {
  getStockOverview,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getFinancialRatios,
  getHistoricalPrice,
  getDividendHistory,
  getShareholders,
  getInsiderTransactions,
  getAnalystRecommendation,
  getNews,
};
