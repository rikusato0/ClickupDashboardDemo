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

/**
 * Render a minute count as "Xh Ym" — falls back to "Xm" under an hour or
 * "Xh" on the hour. Examples: 128 → "2h 8m", 60 → "1h", 45 → "45m", 0 → "0m".
 */
export function fmtMinutes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0m'
  const total = Math.round(value)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${fmtInt(m)}m`
  if (m === 0) return `${fmtInt(h)}h`
  return `${fmtInt(h)}h ${fmtInt(m)}m`
}
