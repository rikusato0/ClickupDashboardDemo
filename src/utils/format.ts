/** US English: thousands separators, consistent across the dashboard. */

export function fmtInt(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Fixed-precision decimals (trailing zeros trimmed by Intl when min = 0).
 * e.g. fmtFixed(1885.5, 1) → "1,885.5"
 */
export function fmtFixed(value: number, maxFractionDigits: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(value)
}

export function fmtExportCell(value: string | number): string {
  if (value === '—' || value === '-') return '—'
  const n = Number(value)
  return Number.isFinite(n) ? fmtFixed(n, 2) : String(value)
}
