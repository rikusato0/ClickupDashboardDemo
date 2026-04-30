import { useMemo } from 'react'
import {
  clients,
  staff,
  weeklyClientInboundEmails,
  weeklyEmailVolume,
} from '../data/mockDashboard'

export function useCommsEmailData() {
  /**
   * Inbound emails from clients: weekly totals (drives the line chart) and
   * a per-client leaderboard summed over the last 4 weeks.
   */
  const inboundWeekly = useMemo(() => {
    const weeks = [
      ...new Set(weeklyClientInboundEmails.map((w) => w.weekStart)),
    ].sort()
    return weeks.map((week) => {
      const total = weeklyClientInboundEmails
        .filter((x) => x.weekStart === week)
        .reduce((a, x) => a + x.received, 0)
      return { week, total }
    })
  }, [])

  const inboundTopClients = useMemo(() => {
    const recent = inboundWeekly.slice(-4).map((w) => w.week)
    const totals = new Map<string, number>()
    for (const row of weeklyClientInboundEmails) {
      if (!recent.includes(row.weekStart)) continue
      totals.set(row.clientId, (totals.get(row.clientId) ?? 0) + row.received)
    }
    return clients
      .map((c) => ({
        clientId: c.id,
        clientName: c.name,
        received: totals.get(c.id) ?? 0,
      }))
      .filter((r) => r.received > 0)
      .sort((a, b) => b.received - a.received)
  }, [inboundWeekly])

  const emailChartData = useMemo(() => {
    const weeks = [...new Set(weeklyEmailVolume.map((w) => w.weekStart))].sort()
    return weeks.map((ws) => {
      const row: Record<string, string | number> = { week: ws }
      let sentSum = 0
      let hrsSum = 0
      for (const s of staff) {
        const cell = weeklyEmailVolume.find(
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
  }, [])

  const last4WeeksEmail = useMemo(
    () => emailChartData.slice(-4),
    [emailChartData],
  )

  return { inboundWeekly, inboundTopClients, emailChartData, last4WeeksEmail }
}
