export const COMMS_CATEGORIES = [
  'Recurring requests',
  'Seasonal events',
  'Bottlenecks',
  'Emergencies',
  'Relationship notes',
  'Ad hoc requests',
] as const
export type CommsCategory = (typeof COMMS_CATEGORIES)[number]

export const TASK_TYPES = [
  'One-time',
  'Recurring',
  'OT',
  'Month end',
  'Payroll',
] as const
export type TaskType = (typeof TASK_TYPES)[number]
