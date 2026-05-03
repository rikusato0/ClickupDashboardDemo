import { useMemo } from 'react'
import { eachDayOfInterval, format, parseISO } from 'date-fns'
import {
  clients,
  staff,
  TASK_TYPES,
  timeEntries,
  type TaskType,
} from '../data/mockDashboard'
import { filterEntries } from '../utils/filterEntries'

export function useTimesheetsData(opts: {
  dateFrom: string
  dateTo: string
  filterStaff: string[] | null
  filterClients: string[] | null
  filterTaskTypes: TaskType[] | null
}) {
  const {
    dateFrom,
    dateTo,
    filterStaff,
    filterClients,
    filterTaskTypes,
  } = opts

  const filterOpts = useMemo(
    () => ({
      from: dateFrom,
      to: dateTo,
      staffIds: filterStaff,
      clientIds: filterClients,
      taskTypes: filterTaskTypes,
    }),
    [dateFrom, dateTo, filterStaff, filterClients, filterTaskTypes],
  )

  const filtered = useMemo(
    () => filterEntries(timeEntries, filterOpts),
    [filterOpts],
  )

  const byClient = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of filtered) {
      m.set(e.clientId, (m.get(e.clientId) ?? 0) + e.hours)
    }
    return clients
      .map((c) => ({ name: c.name, hours: Math.round((m.get(c.id) ?? 0) * 10) / 10 }))
      .filter((r) => r.hours > 0)
      .sort((a, b) => b.hours - a.hours)
  }, [filtered])

  const byClientType = useMemo(() => {
    const rows: Record<string, string | number>[] = []
    for (const c of clients) {
      const row: Record<string, string | number> = { client: c.name }
      let sum = 0
      for (const tt of TASK_TYPES) {
        const hrs = filtered
          .filter((e) => e.clientId === c.id && e.taskType === tt)
          .reduce((a, e) => a + e.hours, 0)
        row[tt] = Math.round(hrs * 10) / 10
        sum += hrs
      }
      row.total = Math.round(sum * 10) / 10
      if (sum > 0) rows.push(row)
    }
    return rows.sort((a, b) => (b.total as number) - (a.total as number))
  }, [filtered])

  const byStaff = useMemo(() => {
    return staff
      .map((s) => {
        const mine = filtered.filter((e) => e.staffId === s.id)
        const hours = Math.round(mine.reduce((a, e) => a + e.hours, 0) * 10) / 10
        const entries = mine.length
        return { ...s, hours, entries }
      })
      .filter((r) => r.hours > 0)
      .sort((a, b) => b.hours - a.hours)
  }, [filtered])

  const exportData = useMemo(() => {
    const days = eachDayOfInterval({
      start: parseISO(dateFrom),
      end: parseISO(dateTo),
    }).filter((d) => d.getDay() !== 0 && d.getDay() !== 6)
    const labels = days.map((d) => format(d, 'EEE M/d'))
    const keys = days.map((d) => format(d, 'yyyy-MM-dd'))
    const targetIds =
      filterStaff === null ? staff.map((s) => s.id) : filterStaff
    const rows = targetIds
      .map((sid) => {
        const s = staff.find((x) => x.id === sid)
        if (!s) return null
        const cells: Record<string, string | number> = { id: s.id, name: s.name }
        let total = 0
        keys.forEach((k, i) => {
          const hrs =
            Math.round(
              filtered
                .filter((e) => e.staffId === s.id && e.date === k)
                .reduce((a, e) => a + e.hours, 0) * 100,
            ) / 100
          cells[labels[i]!] = hrs || '—'
          total += hrs
        })
        cells.total = Math.round(total * 100) / 100
        return cells
      })
      .filter(
        (r): r is Record<string, string | number> => r !== null,
      )
    const totalsRow: Record<string, string | number> = { name: 'Daily total' }
    let grand = 0
    labels.forEach((l) => {
      const sum = rows.reduce((acc, r) => {
        const v = r[l]
        return acc + (typeof v === 'number' ? v : 0)
      }, 0)
      totalsRow[l] = sum > 0 ? Math.round(sum * 100) / 100 : '—'
      grand += sum
    })
    totalsRow.total = Math.round(grand * 100) / 100
    return { labels, keys, rows, totalsRow }
  }, [filtered, dateFrom, dateTo, filterStaff])

  return { filtered, byClient, byClientType, byStaff, exportData }
}
