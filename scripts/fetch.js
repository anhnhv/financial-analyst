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

const VCI_PATH = '/api/vci';
const KBS_PATH = '/api/kbs';

const API_URL = BASE_URL + VCI_PATH; // Change to KBS_PATH for KBS data

// ─── helpers ────────────────────────────────────────────────────────────────

async function get(path) {
  const url = `${API_URL}${path}`;
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
function transformKBSFinancial(pages) {
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

async function fetchTicker(ticker, { period = 'quarterly', numPeriods = 20 } = {}) {
  log(`${ticker}: fetching summary (${period}, ${numPeriods} periods)...`);
  const q = `period=${period}&numPeriods=${numPeriods}`;
  const summary = await get(`/${ticker}/summary?${q}`);

  const f = summary.financials ?? {};

  return {
    ticker,
    period,
    fetchedAt: new Date().toISOString(),
    // overview: transformOverview(summary.overview),
    // incomeStatement: transformFinancial(f.incomeStatement),
    // balanceSheet: transformFinancial(f.balanceSheet),
    // cashFlow: transformFinancial(f.cashFlow),
    // ratios: transformFinancial(f.ratios),
    overview: summary.overview,
    incomeStatement: f.incomeStatement,
    balanceSheet: f.balanceSheet,
    cashFlow: f.cashFlow,
    ratios: f.ratios,
  };
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const outputDir = process.env.OUTPUT_DIR || OUTPUT_DIR;
  const tickers = args.filter((a) => !a.startsWith('--')).map((t) => t.toUpperCase());

  if (tickers.length === 0) {
    console.error('Usage: node scripts/fetch.js <TICKER> [TICKER2 ...]');
    console.error('  Fetches both quarterly (last 20 periods) and yearly (last 5 years) data.');
    console.error(`  Output: ${outputDir}/<TICKER>_quarterly.json, ${outputDir}/<TICKER>_yearly.json`);
    process.exit(1);
  }

  await mkdir(outputDir, { recursive: true });

  // Fetch sectors once
  log('Fetching market sectors...');
  try {
    const res = await fetch(`${BASE_URL}/api/stock/sectors`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const sectors = await res.json();
    const sectorsFile = join(outputDir, 'sectors.json');
    await writeFile(sectorsFile, JSON.stringify(sectors, null, 2), 'utf8');
    log(`Saved → ${outputDir}/sectors.json (${sectors.data?.length ?? '?'} sectors)`);
  } catch (err) {
    console.log(err);
    console.error(`Sectors fetch failed: ${err.message}`);
  }

  // Fetch each ticker for both periods
  const PERIODS = [
    { period: 'quarterly', numPeriods: 20 },
    { period: 'yearly', numPeriods: 6 },
  ];
  const results = { success: [], failed: [] };

  for (const ticker of tickers) {
    let tickerFailed = false;
    for (const { period, numPeriods } of PERIODS) {
      try {
        const data = await fetchTicker(ticker, { period, numPeriods });
        const outFile = join(outputDir, `${ticker}_${period}.json`);
        await writeFile(outFile, JSON.stringify(data, null, 2), 'utf8');
        log(`Saved → ${outputDir}/${ticker}_${period}.json`);
      } catch (err) {
        console.error(`${ticker} (${period}): FAILED — ${err.message}`);
        results.failed.push({ ticker, period, error: err.message });
        tickerFailed = true;
      }
    }
    if (!tickerFailed) results.success.push(ticker);
  }

  // Summary
  console.log('\n─── Summary ───────────────────────────────────────');
  console.log(`Success (${results.success.length}): ${results.success.join(', ') || 'none'}`);
  if (results.failed.length) {
    console.log(`Failed  (${results.failed.length}): ${results.failed.map((f) => `${f.ticker}(${f.period})`).join(', ')}`);
  }
  console.log(`Output directory: ${outputDir}`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
