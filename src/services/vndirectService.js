const axios = require('axios');

/**
 * VNDirect public API service.
 * Provides market data, stock info, and financials.
 */

const VND_BASE = 'https://finfo-api.vndirect.com.vn';

const vndClient = axios.create({
  baseURL: VND_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0',
  },
});

/**
 * Fetch company overview from VNDirect.
 */
async function getCompanyProfile(ticker) {
  const { data } = await vndClient.get('/v4/stocks', {
    params: { q: `code:${ticker.toUpperCase()}`, fields: 'code,companyName,companyNameEng,exchange,industryName,supersector,sector,subsector,listingDate,issueShare,listedValue,foreignPercent,outstandingShare,freeFloat,marketCap,pe,pb,eps,bvps,dividendYield' },
  });
  return data;
}

/**
 * Fetch financial statements (income, balance, cashflow) from VNDirect.
 * reportType: 'income_statement' | 'balance_sheet' | 'cash_flow'
 * reportTermType: 'quarterly' | 'yearly'
 */
async function getFinancialStatements(ticker, reportType = 'income_statement', reportTermType = 'quarterly', size = 20) {
  const { data } = await vndClient.get('/v4/financial-statements', {
    params: {
      q: `reportType:${reportType},code:${ticker.toUpperCase()},reportTermType:${reportTermType}`,
      size,
      sort: 'reportDate:desc',
    },
  });
  return data;
}

/**
 * Fetch financial ratios from VNDirect.
 * reportTermType: 'quarterly' | 'yearly'
 */
async function getFinancialRatios(ticker, reportTermType = 'quarterly', size = 20) {
  const { data } = await vndClient.get('/v4/financial-ratios', {
    params: {
      q: `code:${ticker.toUpperCase()},reportTermType:${reportTermType}`,
      size,
      sort: 'reportDate:desc',
    },
  });
  return data;
}

/**
 * Fetch historical trading data from VNDirect.
 * @param {string} ticker
 * @param {string} startDate  – YYYY-MM-DD
 * @param {string} endDate    – YYYY-MM-DD
 */
async function getHistoricalPrices(ticker, startDate, endDate, size = 1260) {
  const { data } = await vndClient.get('/v4/stock-prices', {
    params: {
      q: `code:${ticker.toUpperCase()},date:gte:${startDate},date:lte:${endDate}`,
      fields: 'date,open,high,low,close,adOpen,adHigh,adLow,adClose,nmVolume,nmValue,ptVolume,ptValue,change,adChange,pctChange',
      size,
      sort: 'date:asc',
    },
  });
  return data;
}

/**
 * Fetch dividend history from VNDirect.
 */
async function getDividends(ticker, size = 40) {
  const { data } = await vndClient.get('/v4/dividends', {
    params: {
      q: `code:${ticker.toUpperCase()}`,
      size,
      sort: 'exDividendDate:desc',
    },
  });
  return data;
}

/**
 * Fetch news/events from VNDirect.
 */
async function getEvents(ticker, size = 20) {
  const { data } = await vndClient.get('/v4/news', {
    params: {
      q: `stocks:${ticker.toUpperCase()}`,
      size,
      sort: 'date:desc',
    },
  });
  return data;
}

/**
 * Fetch market indices from VNDirect.
 * indexCode: 'VNINDEX' | 'HNX-INDEX' | 'UPCOM-INDEX' | 'VN30' etc.
 */
async function getIndexHistory(indexCode, startDate, endDate, size = 1260) {
  const { data } = await vndClient.get('/v4/vnindex-histories', {
    params: {
      q: `indexCode:${indexCode},date:gte:${startDate},date:lte:${endDate}`,
      size,
      sort: 'date:asc',
    },
  });
  return data;
}

/**
 * Fetch foreign trading data from VNDirect.
 */
async function getForeignTrading(ticker, startDate, endDate, size = 1260) {
  const { data } = await vndClient.get('/v4/foreign-tradings', {
    params: {
      q: `code:${ticker.toUpperCase()},date:gte:${startDate},date:lte:${endDate}`,
      size,
      sort: 'date:asc',
    },
  });
  return data;
}

module.exports = {
  getCompanyProfile,
  getFinancialStatements,
  getFinancialRatios,
  getHistoricalPrices,
  getDividends,
  getEvents,
  getIndexHistory,
  getForeignTrading,
};
