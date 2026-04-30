import type { TaskType, TimeEntry } from '../data/mockDashboard'

export function filterEntries(
  entries: TimeEntry[],
  opts: {
    from: string
    to: string
    staffIds: string[] | null
    clientIds: string[] | null
    taskTypes: TaskType[] | null
  },
) {
  return entries.filter((e) => {
    if (e.date < opts.from || e.date > opts.to) return false
    if (
      opts.staffIds !== null &&
      !opts.staffIds.includes(e.staffId)
    )
      return false
    if (
      opts.clientIds !== null &&
      !opts.clientIds.includes(e.clientId)
    )
      return false
    if (
      opts.taskTypes !== null &&
      !opts.taskTypes.includes(e.taskType)
    )
      return false
    return true
  })
}
