#!/usr/bin/env node
/**
 * Fetch VN stock data from the local API and save to output/ directory.
 *
 * Usage:
 *   node scripts/fetch.js VNM FPT VIC
 *
 * Output:
 *   output/<TICKER>.json  — per-ticker data (overview, price, financials)
 *   output/sectors.json   — all market sectors
 */

'use strict';

const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');

const OUTPUT_DIR = join(__dirname, '..', 'output');
const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// ─── helpers ────────────────────────────────────────────────────────────────

async function get(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json();
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ─── transformers ────────────────────────────────────────────────────────────

/** Compact overview: only the fields an AI needs */
function transformOverview(raw) {
  return {
    symbol: raw.symbol,
    name: raw.nameEn || raw.name,
    exchange: raw.exchange,
    refPrice: raw.re / 1000,
    ceiling: raw.ceiling / 1000,
    floor: raw.floor / 1000,
  };
}

/**
 * Flatten multi-page KBS financial statement into a compact table.
 * Returns { periods: string[], rows: { item, unit?, values }[] }
 *
 * Deduplication: skips repeated TermCode+YearPeriod combinations so the
 * KBS API's duplicate "Q4 2025" entries (one per report revision) collapse
 * into a single column.
 */
function transformFinancial(pages) {
  if (!Array.isArray(pages) || pages.length === 0) return { periods: [], rows: [] };

  // Build ordered list of unique columns, tracking which (page, valueKey) to read
  const seen = new Set();
  const columns = []; // { pageIdx, valueKey, label }

  for (let pi = 0; pi < pages.length; pi++) {
    const heads = pages[pi].Head ?? [];
    for (let hi = 0; hi < heads.length; hi++) {
      const h = heads[hi];
      const label = `${h.TermCode} ${h.YearPeriod}`;
      if (!seen.has(label)) {
        seen.add(label);
        columns.push({ pageIdx: pi, valueKey: `Value${hi + 1}`, label });
      }
    }
  }

  const periods = columns.map((c) => c.label);

  // Collect rows: NameEn → { unit, values keyed by label }
  const rowMap = new Map();

  for (const { pageIdx, valueKey, label } of columns) {
    const content = pages[pageIdx].Content ?? {};
    for (const sectionRows of Object.values(content)) {
      for (const row of sectionRows) {
        const item = row.NameEn?.trim();
        if (!item) continue;
        if (!rowMap.has(item)) {
          rowMap.set(item, { unit: row.UnitEn || null, byLabel: {} });
        }
        rowMap.get(item).byLabel[label] = row[valueKey] ?? null;
      }
    }
  }

  const rows = Array.from(rowMap.entries()).map(([item, { unit, byLabel }]) => {
    const entry = { item, values: periods.map((p) => byLabel[p] ?? null) };
    if (unit) entry.unit = unit;
    return entry;
  });

  return { periods, rows };
}

// ─── fetch per-ticker data ───────────────────────────────────────────────────

async function fetchTicker(ticker) {
  log(`${ticker}: fetching overview...`);
  const overview = await get(`/api/stock/${ticker}/overview`);

  log(`${ticker}: fetching income statement (quarterly, 20 periods)...`);
  const incomeStatement = await get(
    `/api/stock/${ticker}/income-statement?period=quarterly&numPeriods=20`
  );

  log(`${ticker}: fetching balance sheet (quarterly, 20 periods)...`);
  const balanceSheet = await get(
    `/api/stock/${ticker}/balance-sheet?period=quarterly&numPeriods=20`
  );

  log(`${ticker}: fetching cash flow (quarterly, 20 periods)...`);
  const cashFlow = await get(
    `/api/stock/${ticker}/cash-flow?period=quarterly&numPeriods=20`
  );

  log(`${ticker}: fetching financial ratios (quarterly, 20 periods)...`);
  const ratios = await get(
    `/api/stock/${ticker}/ratios?period=quarterly&numPeriods=20`
  );

  return {
    ticker,
    fetchedAt: new Date().toISOString(),
    overview: transformOverview(overview.data ?? overview),
    incomeStatement: transformFinancial(incomeStatement.data ?? incomeStatement),
    balanceSheet: transformFinancial(balanceSheet.data ?? balanceSheet),
    cashFlow: transformFinancial(cashFlow.data ?? cashFlow),
    ratios: transformFinancial(ratios.data ?? ratios),
  };
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const tickers = process.argv.slice(2).map((t) => t.toUpperCase());

  if (tickers.length === 0) {
    console.error('Usage: node scripts/fetch.js <TICKER> [TICKER2 ...]');
    console.error('Example: node scripts/fetch.js VNM FPT VIC');
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  // Fetch sectors once
  log('Fetching market sectors...');
  try {
    const sectors = await get('/api/stock/sectors');
    const sectorsFile = join(OUTPUT_DIR, 'sectors.json');
    await writeFile(sectorsFile, JSON.stringify(sectors, null, 2), 'utf8');
    log(`Saved → output/sectors.json (${sectors.data?.length ?? '?'} sectors)`);
  } catch (err) {
    console.error(`Sectors fetch failed: ${err.message}`);
  }

  // Fetch each ticker
  const results = { success: [], failed: [] };

  for (const ticker of tickers) {
    try {
      const data = await fetchTicker(ticker);
      const outFile = join(OUTPUT_DIR, `${ticker}.json`);
      await writeFile(outFile, JSON.stringify(data, null, 2), 'utf8');
      log(`Saved → output/${ticker}.json`);
      results.success.push(ticker);
    } catch (err) {
      console.error(`${ticker}: FAILED — ${err.message}`);
      results.failed.push({ ticker, error: err.message });
    }
  }

  // Summary
  console.log('\n─── Summary ───────────────────────────────────────');
  console.log(`Success (${results.success.length}): ${results.success.join(', ') || 'none'}`);
  if (results.failed.length) {
    console.log(`Failed  (${results.failed.length}): ${results.failed.map((f) => f.ticker).join(', ')}`);
  }
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
