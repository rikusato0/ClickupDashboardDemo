/**
 * Industry guidance: 0–2h = fast, 2–4h = warning, 4h+ = critical for
 * client-response medians. Centralised so chart fills, KPI numbers, and
 * row badges stay in sync.
 */
export type RespSeverity = 'fast' | 'warning' | 'critical'

export const FAST_MAX_MIN = 120
export const WARNING_MAX_MIN = 240

export function responseSeverity(minutes: number): RespSeverity {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'fast'
  if (minutes < FAST_MAX_MIN) return 'fast'
  if (minutes < WARNING_MAX_MIN) return 'warning'
  return 'critical'
}

export const SEVERITY_TEXT: Record<RespSeverity, string> = {
  fast: 'text-emerald-600',
  warning: 'text-amber-600',
  critical: 'text-wl-orange',
}

export const SEVERITY_BADGE: Record<RespSeverity, string> = {
  fast: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  critical: 'bg-wl-orange/10 text-wl-orange border border-wl-orange/30',
}

export const SEVERITY_LABEL: Record<RespSeverity, string> = {
  fast: 'Fast',
  warning: 'Warning',
  critical: 'Critical',
}

export const SEVERITY_FILL: Record<RespSeverity, string> = {
  fast: '#10b981',
  warning: '#f59e0b',
  critical: '#ff8500',
}
