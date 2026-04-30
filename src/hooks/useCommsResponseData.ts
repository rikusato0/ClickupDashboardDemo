import { useMemo } from 'react'
import {
  clientContacts,
  clients,
  dailyResponseTimes,
  responseByContact,
  staff,
} from '../data/mockDashboard'

/**
 * 6-month daily series with a 14-day rolling average so the chart can
 * render both the raw daily noise and a smoothed trend line. Computed
 * once at module load — the underlying data is static.
 */
const RESP_TREND = (() => {
  const windowSize = 14
  const series = dailyResponseTimes.map((d, i) => {
    const slice = dailyResponseTimes.slice(
      Math.max(0, i - windowSize + 1),
      i + 1,
    )
    const avg =
      slice.reduce((a, x) => a + x.medianMinutes, 0) /
      Math.max(1, slice.length)
    return {
      date: d.date,
      medianMinutes: d.medianMinutes,
      rolling14: Math.round(avg),
      sampleSize: d.sampleSize,
    }
  })
  if (series.length === 0) {
    return { series, first14Avg: 0, last14Avg: 0, change: 0 }
  }
  const first14 = series.slice(0, 14)
  const last14 = series.slice(-14)
  const first14Avg = Math.round(
    first14.reduce((a, x) => a + x.medianMinutes, 0) / first14.length,
  )
  const last14Avg = Math.round(
    last14.reduce((a, x) => a + x.medianMinutes, 0) / last14.length,
  )
  const change =
    first14Avg > 0 ? (last14Avg - first14Avg) / first14Avg : 0
  return { series, first14Avg, last14Avg, change }
})()

export function useCommsResponseData(opts: {
  respStaffFilter: string[] | null
  respAlertDirection: 'above' | 'below'
  respAlertThreshold: number
}) {
  const { respStaffFilter, respAlertDirection, respAlertThreshold } = opts

  const respByStaff = useMemo(() => {
    const agg = new Map<string, number[]>()
    for (const r of responseByContact) {
      if (
        respStaffFilter !== null &&
        !respStaffFilter.includes(r.staffId)
      )
        continue
      if (!agg.has(r.staffId)) agg.set(r.staffId, [])
      agg.get(r.staffId)!.push(r.medianMinutes)
    }
    return staff
      .map((s) => {
        const vals = agg.get(s.id) ?? []
        const med =
          vals.length === 0
            ? 0
            : [...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)]!
        const nm = vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
        return {
          name: s.name,
          median: Math.round(med),
          mean: Math.round(nm),
          samples: vals.length,
        }
      })
      .filter((r) => r.samples > 0)
      .sort((a, b) => a.median - b.median)
  }, [respStaffFilter])

  const respByContactPriority = useMemo(() => {
    return clientContacts.map((c) => {
      const related = responseByContact.filter((r) => r.contactId === c.id)
      const medians = related.map((r) => r.medianMinutes).sort((a, b) => a - b)
      const med =
        medians.length === 0
          ? 0
          : medians[Math.floor(medians.length / 2)]!
      const client = clients.find((x) => x.id === c.clientId)!
      return {
        ...c,
        clientName: client.name,
        median: med,
        priority: c.priority,
      }
    })
  }, [])

  const respByClient = useMemo(() => {
    const groups = new Map<string, number[]>()
    for (const row of respByContactPriority) {
      if (row.median <= 0) continue
      const list = groups.get(row.clientId) ?? []
      list.push(row.median)
      groups.set(row.clientId, list)
    }
    return clients
      .map((c) => {
        const samples = (groups.get(c.id) ?? []).sort((a, b) => a - b)
        const median =
          samples.length === 0
            ? 0
            : samples[Math.floor(samples.length / 2)]!
        return {
          clientId: c.id,
          clientName: c.name,
          median,
          samples: samples.length,
        }
      })
      .filter((r) => r.samples > 0)
      .sort((a, b) => b.median - a.median)
  }, [respByContactPriority])

  const respAlerts = useMemo(() => {
    return respByClient.filter((r) =>
      respAlertDirection === 'above'
        ? r.median > respAlertThreshold
        : r.median < respAlertThreshold,
    )
  }, [respByClient, respAlertDirection, respAlertThreshold])

  return {
    respByStaff,
    respByContactPriority,
    respByClient,
    respAlerts,
    respTrend: RESP_TREND,
  }
}
