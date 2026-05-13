/**
 * VCI (Viet Capital Securities) public data service.
 *
 * Financial data:  https://iq.vietcap.com.vn/api/iq-insight-service
 * Trading/price:   https://trading.vietcap.com.vn/api
 *
 * Financial section codes:
 *   INCOME_STATEMENT | BALANCE_SHEET | CASH_FLOW
 *   statistics-financial → ratios
 *
 * Price timeFrame values: ONE_DAY | ONE_HOUR | ONE_MINUTE
 * (VCI doesn't have native weekly/monthly bars; 1W/1M return daily data)
 */

const axios = require('axios');

const VCI_IQ = 'https://iq.vietcap.com.vn/api/iq-insight-service';
const VCI_TRADING = 'https://trading.vietcap.com.vn/api';

const IQ_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://iq.vietcap.com.vn/',
};

const TRADING_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://trading.vietcap.com.vn/',
};

const iqClient = axios.create({ baseURL: VCI_IQ, timeout: 15000, headers: IQ_HEADERS });
const tradingClient = axios.create({ baseURL: VCI_TRADING, timeout: 15000, headers: TRADING_HEADERS });

const INTERVAL_MAP = {
  '1D': 'ONE_DAY',
  '1W': 'ONE_DAY', // VCI has no native weekly bars; caller may resample
  '1M': 'ONE_DAY', // VCI has no native monthly bars; caller may resample
  '1H': 'ONE_HOUR',
  '1m': 'ONE_MINUTE',
};

// ── Field Translation ────────────────────────────────────────────────────────

/** Keys that are row metadata and should not be renamed. */
const META_KEYS = new Set([
  'organCode', 'ticker', 'createDate', 'updateDate',
  'yearReport', 'lengthReport', 'publicDate',
]);

/**
 * Fetch field definitions from VCI's metrics endpoint.
 * Returns { fieldCode: { en, vi }, … } covering IS / BS / CF sections.
 * Different company types (CT, NH, CK, BH) have different field sets.
 */
async function getRawFieldMeta(ticker) {
  const key = ticker.toUpperCase();
  const { data } = await iqClient.get(`/v1/company/${key}/financial-statement/metrics`);
  const sections = data?.data ?? data;
  const map = {};
  for (const section of ['INCOME_STATEMENT', 'BALANCE_SHEET', 'CASH_FLOW']) {
    for (const row of (sections[section] || [])) {
      if (row.field) {
        map[row.field] = { en: row.titleEn || row.field, vi: row.titleVi || row.field };
      }
    }
  }
  return map;
}

/**
 * Build a field→label dict for the requested language.
 * When two fields share the same label the field code is appended in parentheses
 * to disambiguate (e.g. "Short-term investments (bsa5)").
 * lang: 'en' | 'vi'
 */
async function getLabelMap(ticker, lang = 'en') {
  const meta = await getRawFieldMeta(ticker);
  const labelCount = {};
  for (const names of Object.values(meta)) {
    const label = names[lang] || names.en;
    labelCount[label] = (labelCount[label] || 0) + 1;
  }
  const result = {};
  for (const [field, names] of Object.entries(meta)) {
    const base = names[lang] || names.en;
    result[field] = labelCount[base] > 1 ? `${base} (${field})` : base;
  }
  return result;
}

/** Rename financial-data keys in an array of rows using a label map.
 *  Keys with no mapping (sector-specific unused fields) are dropped entirely. */
function applyLabelMap(rows, labelMap) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (META_KEYS.has(k)) {
        out[k] = v;
      } else if (labelMap[k]) {
        out[labelMap[k]] = v;
      }
      // no mapping → sector-specific unused field, skip
    }
    return out;
  });
}

/** Estimate trading-day count between two ISO date strings (plus a buffer). */
function estimateCountBack(startDate, endDate) {
  const from = new Date(startDate).getTime();
  const to = new Date(endDate).getTime();
  const calDays = Math.ceil((to - from) / 86400000);
  return Math.ceil(calDays * 0.73) + 20; // ~73 % of calendar days are trading + buffer
}

/**
 * Fetch a single financial statement section.
 * section: 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'CASH_FLOW'
 * type: 'quarterly' | 'yearly'
 */
async function getFinancialStatement(ticker, section, type = 'quarterly', lang = 'en') {
  const { data } = await iqClient.get(
    `/v1/company/${ticker.toUpperCase()}/financial-statement`,
    { params: { section } },
  );
  const payload = data?.data ?? data;
  const rows = type === 'yearly' ? (payload?.years ?? payload) : (payload?.quarters ?? payload);
  const labelMap = await getLabelMap(ticker, lang);
  return applyLabelMap(rows, labelMap);
}

/**
 * Fetch company basic info from the symbol listing.
 */
async function getStockOverview(ticker) {
  const { data } = await tradingClient.get('/price/symbols/getAll');
  const list = Array.isArray(data) ? data : [];
  return list.find((s) => s.symbol === ticker.toUpperCase()) || null;
}

/**
 * Fetch Income Statement.
 * type: 'quarterly' | 'yearly'
 */
async function getIncomeStatement(ticker, type = 'quarterly', lang = 'en') {
  return getFinancialStatement(ticker, 'INCOME_STATEMENT', type, lang);
}

/**
 * Fetch Balance Sheet.
 * type: 'quarterly' | 'yearly'  lang: 'en' | 'vi'
 */
async function getBalanceSheet(ticker, type = 'quarterly', lang = 'en') {
  return getFinancialStatement(ticker, 'BALANCE_SHEET', type, lang);
}

/**
 * Fetch Cash Flow Statement.
 * type: 'quarterly' | 'yearly'  lang: 'en' | 'vi'
 */
async function getCashFlow(ticker, type = 'quarterly', lang = 'en') {
  return getFinancialStatement(ticker, 'CASH_FLOW', type, lang);
}

/**
 * Fetch Financial Ratios (PE, PB, ROE, ROA, etc.).
 * Returns an array sorted newest-first with both yearly and TTM entries.
 */
async function getFinancialRatios(ticker) {
  const { data } = await iqClient.get(
    `/v1/company/${ticker.toUpperCase()}/statistics-financial`,
  );
  return data?.data ?? data;
}

/**
 * Fetch historical OHLCV price data.
 * startDate / endDate: 'YYYY-MM-DD'
 * interval: '1D' | '1W' | '1M' | '1H'
 *
 * Returns normalized array of { time, open, high, low, close, volume, value }.
 * 'time' is a Unix timestamp (seconds).
 */
async function getHistoricalPrice(ticker, startDate, endDate, interval = '1D') {
  const toTs = Math.floor(new Date(endDate).getTime() / 1000) + 86400; // inclusive end
  const countBack = estimateCountBack(startDate, endDate);
  const timeFrame = INTERVAL_MAP[interval] || 'ONE_DAY';

  const { data } = await tradingClient.post('/chart/OHLCChart/gap-chart', {
    timeFrame,
    symbols: [ticker.toUpperCase()],
    to: toTs,
    countBack,
  });

  // Normalize array-of-arrays format to array-of-objects
  if (Array.isArray(data) && data.length > 0) {
    const s = data[0];
    if (s && Array.isArray(s.t)) {
      const fromTs = Math.floor(new Date(startDate).getTime() / 1000);
      return s.t
        .map((t, i) => ({
          time: parseInt(t),
          open: s.o?.[i] ?? null,
          high: s.h?.[i] ?? null,
          low: s.l?.[i] ?? null,
          close: s.c?.[i] ?? null,
          volume: s.v?.[i] ?? null,
          value: s.accumulatedValue?.[i] ?? null,
        }))
        .filter((bar) => bar.time >= fromTs); // trim to requested range
    }
  }
  return data;
}

/**
 * Fetch intraday tick-by-tick data.
 * lastTime: Unix timestamp (seconds) for pagination cursor, null = latest
 */
async function getIntraday(ticker, limit = 100, lastTime = null) {
  const { data } = await tradingClient.post('/market-watch/LEData/getAll', {
    symbol: ticker.toUpperCase(),
    limit,
    truncTime: lastTime,
  });
  return Array.isArray(data) ? data : (data?.data ?? data);
}

/**
 * Fetch all listed symbols.
 */
async function getAllSymbols() {
  const { data } = await tradingClient.get('/price/symbols/getAll');
  return data;
}

/**
 * Fetch symbols belonging to a market group.
 * group: 'VN30' | 'HOSE' | 'HNX' | 'UPCOM' | 'VN100' | 'HNX30' | etc.
 */
async function getSymbolsByGroup(group) {
  const { data } = await tradingClient.get('/price/symbols/getByGroup', {
    params: { group },
  });
  return data;
}

/**
 * Fetch ICB industry sector codes.
 */
async function getSectors() {
  const { data } = await iqClient.get('/v1/sectors/icb-codes');
  return data?.data ?? data;
}

module.exports = {
  getStockOverview,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getFinancialRatios,
  getHistoricalPrice,
  getIntraday,
  getAllSymbols,
  getSymbolsByGroup,
  getSectors,
};
