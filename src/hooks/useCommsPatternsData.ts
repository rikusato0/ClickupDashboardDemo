import { useMemo } from 'react'
import {
  COMMS_CATEGORIES,
  type CommsCategory,
  monthlyPatternsByClient,
  patternSamples,
  patternTrends,
  predictedClientNeeds,
} from '../data/mockDashboard'

export function useCommsPatternsData(opts: {
  patternsClientId: string
  patternDrillId: string | null
}) {
  const { patternsClientId, patternDrillId } = opts

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
    const months = [
      ...new Set(monthlyPatternsByClient.map((m) => m.month)),
    ].sort()
    return months.map((month) => {
      const row: Record<string, string | number> = { month }
      for (const cat of COMMS_CATEGORIES) {
        const cell = monthlyPatternsByClient.find(
          (m) =>
            m.clientId === patternsClientId &&
            m.month === month &&
            m.category === cat,
        )
        row[cat] = cell?.volume ?? 0
      }
      return row
    })
  }, [patternsClientId])

  const upcomingPredictedNeeds = useMemo(() => {
    return [...predictedClientNeeds].sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate),
    )
  }, [])

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
