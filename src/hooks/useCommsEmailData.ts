import { useMemo } from 'react'
import { addDays, max as dfMax, min as dfMin, parseISO } from 'date-fns'
import { useDashboard } from '../context/DashboardContext'

function weekOverlapsRange(
  weekStartStr: string,
  fromStr: string,
  toStr: string,
): boolean {
  const ws = parseISO(weekStartStr)
  const we = addDays(ws, 6)
  const from = parseISO(fromStr)
  const to = parseISO(toStr)
  return dfMax([ws, from]) <= dfMin([we, to])
}

export function useCommsEmailData(opts: {
  commsPeriodFrom: string
  commsPeriodTo: string
  commsFilterClients: string[] | null
  commsFilterStaff: string[] | null
}) {
  const { snapshot } = useDashboard()
  const clients = snapshot?.clients ?? []
  const staff = snapshot?.staff ?? []
  const weeklyClientInboundEmails = snapshot?.weeklyClientInboundEmails ?? []
  const weeklyEmailVolume = snapshot?.weeklyEmailVolume ?? []

  const { commsPeriodFrom, commsPeriodTo, commsFilterClients, commsFilterStaff } =
    opts

  const inboundWeekly = useMemo(() => {
    const rows = weeklyClientInboundEmails.filter((row) => {
      if (!weekOverlapsRange(row.weekStart, commsPeriodFrom, commsPeriodTo)) {
        return false
      }
      if (
        commsFilterClients !== null &&
        !commsFilterClients.includes(row.clientId)
      ) {
        return false
      }
      return true
    })
    const weeks = [...new Set(rows.map((w) => w.weekStart))].sort()
    return weeks.map((week) => ({
      week,
      total: rows
        .filter((x) => x.weekStart === week)
        .reduce((a, x) => a + x.received, 0),
    }))
  }, [commsPeriodFrom, commsPeriodTo, commsFilterClients, weeklyClientInboundEmails])

  const inboundTopClients = useMemo(() => {
    const recentWeeks = inboundWeekly.slice(-4).map((w) => w.week)
    const totals = new Map<string, number>()
    for (const row of weeklyClientInboundEmails) {
      if (!recentWeeks.includes(row.weekStart)) continue
      if (
        commsFilterClients !== null &&
        !commsFilterClients.includes(row.clientId)
      ) {
        continue
      }
      if (!weekOverlapsRange(row.weekStart, commsPeriodFrom, commsPeriodTo)) {
        continue
      }
      totals.set(row.clientId, (totals.get(row.clientId) ?? 0) + row.received)
    }
    const clientPool =
      commsFilterClients === null
        ? clients
        : clients.filter((c) => commsFilterClients.includes(c.id))
    return clientPool
      .map((c) => ({
        clientId: c.id,
        clientName: c.name,
        received: totals.get(c.id) ?? 0,
      }))
      .filter((r) => r.received > 0)
      .sort((a, b) => b.received - a.received)
  }, [
    inboundWeekly,
    commsFilterClients,
    commsPeriodFrom,
    commsPeriodTo,
    clients,
    weeklyClientInboundEmails,
  ])

  const emailChartData = useMemo(() => {
    const volRows = weeklyEmailVolume.filter((row) => {
      if (!weekOverlapsRange(row.weekStart, commsPeriodFrom, commsPeriodTo)) {
        return false
      }
      if (
        commsFilterStaff !== null &&
        !commsFilterStaff.includes(row.staffId)
      ) {
        return false
      }
      return true
    })
    const weeks = [...new Set(volRows.map((w) => w.weekStart))].sort()
    const staffPool =
      commsFilterStaff === null
        ? staff
        : staff.filter((s) => commsFilterStaff.includes(s.id))
    return weeks.map((ws) => {
      const row: Record<string, string | number> = { week: ws }
      let sentSum = 0
      let hrsSum = 0
      for (const s of staffPool) {
        const cell = volRows.find(
          (x) => x.weekStart === ws && x.staffId === s.id,
        )
        row[s.initials] = cell?.sent ?? 0
        sentSum += cell?.sent ?? 0
        hrsSum += cell?.loggedHours ?? 0
      }
      row['_team_sent'] = sentSum
      row['_team_hours'] = Math.round(hrsSum * 10) / 10
      return row
    })
  }, [commsPeriodFrom, commsPeriodTo, commsFilterStaff, staff, weeklyEmailVolume])

  const last4WeeksEmail = useMemo(
    () => emailChartData.slice(-4),
    [emailChartData],
  )

  return { inboundWeekly, inboundTopClients, emailChartData, last4WeeksEmail }
}
