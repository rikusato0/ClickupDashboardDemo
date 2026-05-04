import type { TaskType } from '../types/dashboard'

export const CHART_PRIMARY = '#06b6d4'
export const CHART_GRID = '#e5e7eb'
export const CHART_TICK = { fill: '#64748b', fontSize: 12 }
export const CHART_TICK_SM = { fill: '#64748b', fontSize: 11 }

export const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  color: '#1e293b',
}

export const TASK_COLORS: Record<TaskType, string> = {
  'One-time': '#06b6d4',
  Recurring: '#0891b2',
  OT: '#ff8500',
  'Month end': '#0e7490',
  Payroll: '#67e8f9',
}
