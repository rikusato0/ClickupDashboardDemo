import { useMemo } from 'react'
import {
  clients,
  COMMS_CATEGORIES,
  type CommsCategory,
  monthlyPatternsByClient,
  patternSamples,
  patternTrends,
  predictedClientNeeds,
} from '../data/mockDashboard'

export function useCommsPatternsData(opts: {
  commsFilterClients: string[] | null
  commsPeriodFrom: string
  commsPeriodTo: string
  patternDrillId: string | null
}) {
  const { commsFilterClients, commsPeriodFrom, commsPeriodTo, patternDrillId } =
    opts

  const patternMixTotals = useMemo(() => {
    const totals = new Map<CommsCategory, number>()
    for (const p of patternTrends) {
      const sum = p.weeklyVolumes.reduce((a, x) => a + x, 0)
      totals.set(p.category, (totals.get(p.category) ?? 0) + sum)
    }
    return COMMS_CATEGORIES.map((cat) => ({
      category: cat,
      total: totals.get(cat) ?? 0,
    }))
  }, [])

  const monthlyPatternsForClient = useMemo(() => {
    const clientIds =
      commsFilterClients === null
        ? clients.map((c) => c.id)
        : commsFilterClients
    const fromMonth = commsPeriodFrom.slice(0, 7)
    const toMonth = commsPeriodTo.slice(0, 7)
    const monthSet = new Set(monthlyPatternsByClient.map((m) => m.month))
    const months = [...monthSet].sort().filter((m) => m >= fromMonth && m <= toMonth)

    return months.map((month) => {
      const row: Record<string, string | number> = { month }
      for (const cat of COMMS_CATEGORIES) {
        let sum = 0
        for (const cid of clientIds) {
          const cell = monthlyPatternsByClient.find(
            (x) =>
              x.clientId === cid && x.month === month && x.category === cat,
          )
          sum += cell?.volume ?? 0
        }
        row[cat] = sum
      }
      return row
    })
  }, [commsFilterClients, commsPeriodFrom, commsPeriodTo])

  const upcomingPredictedNeeds = useMemo(() => {
    const allow =
      commsFilterClients === null ? null : new Set(commsFilterClients)
    return [...predictedClientNeeds]
      .filter((n) => allow === null || allow.has(n.clientId))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [commsFilterClients])

  const patternDrill = useMemo(() => {
    if (!patternDrillId) return null
    const trend = patternTrends.find((p) => p.id === patternDrillId)
    if (!trend) return null
    const samples = patternSamples.filter((s) => s.patternId === patternDrillId)
    return { trend, samples }
  }, [patternDrillId])

  return {
    patternMixTotals,
    monthlyPatternsForClient,
    upcomingPredictedNeeds,
    patternDrill,
  }
}
