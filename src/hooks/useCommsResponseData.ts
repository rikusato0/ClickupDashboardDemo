import { useMemo } from 'react'
import { useDashboard } from '../context/DashboardContext'

function buildRespTrend(
  daily: { date: string; medianMinutes: number; sampleSize: number }[],
) {
  const windowSize = 14
  const series = daily.map((d, i) => {
    const slice = daily.slice(Math.max(0, i - windowSize + 1), i + 1)
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
}

export function useCommsResponseData(opts: {
  commsPeriodFrom: string
  commsPeriodTo: string
  commsFilterClients: string[] | null
  commsFilterStaff: string[] | null
}) {
  const { snapshot } = useDashboard()
  const clientContacts = snapshot?.clientContacts ?? []
  const clients = snapshot?.clients ?? []
  const dailyResponseTimes = snapshot?.dailyResponseTimes ?? []
  const responseByContact = snapshot?.responseByContact ?? []
  const staff = snapshot?.staff ?? []

  const { commsPeriodFrom, commsPeriodTo, commsFilterClients, commsFilterStaff } =
    opts

  const contactById = useMemo(
    () => new Map(clientContacts.map((c) => [c.id, c])),
    [clientContacts],
  )

  const filteredResponseRows = useMemo(() => {
    return responseByContact.filter((r) => {
      if (
        commsFilterStaff !== null &&
        !commsFilterStaff.includes(r.staffId)
      ) {
        return false
      }
      const contact = contactById.get(r.contactId)
      if (!contact) return false
      if (
        commsFilterClients !== null &&
        !commsFilterClients.includes(contact.clientId)
      ) {
        return false
      }
      return true
    })
  }, [responseByContact, commsFilterClients, commsFilterStaff, contactById])

  const teamMedian = useMemo(() => {
    const vals = filteredResponseRows
      .map((r) => r.medianMinutes)
      .sort((a, b) => a - b)
    if (vals.length === 0) return 0
    const mid = Math.floor(vals.length / 2)
    return vals.length % 2
      ? vals[mid]!
      : (vals[mid - 1]! + vals[mid]!) / 2
  }, [filteredResponseRows])

  const respByStaff = useMemo(() => {
    const agg = new Map<string, number[]>()
    for (const r of filteredResponseRows) {
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
  }, [filteredResponseRows, staff])

  const respByContactPriority = useMemo(() => {
    return clientContacts
      .filter((c) => {
        if (commsFilterClients === null) return true
        return commsFilterClients.includes(c.clientId)
      })
      .map((c) => {
        const related = filteredResponseRows.filter(
          (r) => r.contactId === c.id,
        )
        const medians = related
          .map((r) => r.medianMinutes)
          .sort((a, b) => a - b)
        const med =
          medians.length === 0
            ? 0
            : medians[Math.floor(medians.length / 2)]!
        const client = clients.find((x) => x.id === c.clientId)
        return {
          ...c,
          clientName: client?.name ?? 'Client',
          median: med,
          priority: c.priority,
        }
      })
  }, [filteredResponseRows, commsFilterClients, clientContacts, clients])

  const respByClient = useMemo(() => {
    const groups = new Map<string, number[]>()
    for (const row of respByContactPriority) {
      if (row.median <= 0) continue
      const list = groups.get(row.clientId) ?? []
      list.push(row.median)
      groups.set(row.clientId, list)
    }
    const clientPool =
      commsFilterClients === null
        ? clients
        : clients.filter((c) => commsFilterClients.includes(c.id))
    return clientPool
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
  }, [respByContactPriority, commsFilterClients, clients])

  const respTrend = useMemo(() => {
    const daily = dailyResponseTimes.filter(
      (d) => d.date >= commsPeriodFrom && d.date <= commsPeriodTo,
    )
    return buildRespTrend(daily)
  }, [commsPeriodFrom, commsPeriodTo, dailyResponseTimes])

  return {
    teamMedian,
    respByStaff,
    respByContactPriority,
    respByClient,
    respTrend,
  }
}
