/**
 * Date/Quarter utility helpers
 */

/**
 * Returns the last N years from the current date as an array of year numbers.
 * @param {number} n
 * @returns {number[]}
 */
function getLastNYears(n = 5) {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: n }, (_, i) => currentYear - i).reverse();
}

/**
 * Returns all (year, quarter) pairs for the last N years, up to the current quarter.
 * @param {number} n
 * @returns {{ year: number, quarter: number }[]}
 */
function getLastNYearsQuarters(n = 5) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 4);
  const startYear = currentYear - n + 1;
  const result = [];

  for (let y = startYear; y <= currentYear; y++) {
    const maxQ = y === currentYear ? currentQuarter : 4;
    for (let q = 1; q <= maxQ; q++) {
      result.push({ year: y, quarter: q });
    }
  }
  return result;
}

/**
 * Validate year and quarter query params.
 * @param {string|number} year
 * @param {string|number} quarter  – pass null/undefined to skip quarter check
 */
function validateYearQuarter(year, quarter) {
  const y = parseInt(year, 10);
  if (isNaN(y) || y < 2000 || y > 2100) {
    return { valid: false, message: 'Invalid year. Must be between 2000 and 2100.' };
  }
  if (quarter !== undefined && quarter !== null && quarter !== '') {
    const q = parseInt(quarter, 10);
    if (isNaN(q) || q < 1 || q > 4) {
      return { valid: false, message: 'Invalid quarter. Must be 1, 2, 3, or 4.' };
    }
  }
  return { valid: true };
}

module.exports = { getLastNYears, getLastNYearsQuarters, validateYearQuarter };
