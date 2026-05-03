import { useMemo } from 'react'
import {
  pairwiseSentiment,
  sentimentBiweekly,
  sentimentSampleSets,
} from '../data/mockDashboard'
import { fmtInt } from '../utils/format'

export function useSentimentData(opts: {
  sentimentClientId: string | null
  sentimentDrill: { clientId: string; periodEnd: string } | null
  sentimentPeriodFrom?: string
  sentimentPeriodTo?: string
}) {
  const {
    sentimentClientId,
    sentimentDrill,
    sentimentPeriodFrom,
    sentimentPeriodTo,
  } = opts

  const sentimentTrend = useMemo(() => {
    const inRange =
      sentimentPeriodFrom != null && sentimentPeriodTo != null
        ? (r: { periodEnd: string }) =>
            r.periodEnd >= sentimentPeriodFrom &&
            r.periodEnd <= sentimentPeriodTo
        : () => true

    const inWindow = sentimentBiweekly.filter((r) => inRange(r))

    if (sentimentClientId != null) {
      return inWindow
        .filter((r) => r.clientId === sentimentClientId)
        .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))
    }

    const byPeriod = new Map<
      string,
      { scoreWeight: number; weightSum: number; msgSum: number; reasonParts: string[] }
    >()
    for (const r of inWindow) {
      const weight = r.msgCount > 0 ? r.msgCount : 1
      const cur = byPeriod.get(r.periodEnd) ?? {
        scoreWeight: 0,
        weightSum: 0,
        msgSum: 0,
        reasonParts: [] as string[],
      }
      cur.scoreWeight += r.score * weight
      cur.weightSum += weight
      cur.msgSum += r.msgCount
      cur.reasonParts.push(r.topReason)
      byPeriod.set(r.periodEnd, cur)
    }

    return [...byPeriod.entries()]
      .map(([periodEnd, agg]) => {
        const score =
          agg.weightSum > 0
            ? Math.round((agg.scoreWeight / agg.weightSum) * 100) / 100
            : 0
        const uniqReasons = new Set(agg.reasonParts)
        const topReason =
          uniqReasons.size === 1
            ? [...uniqReasons][0]!
            : `Weighted blend · ${fmtInt(uniqReasons.size)} themes`
        return {
          periodEnd,
          score,
          msgCount: agg.msgSum,
          topReason,
        }
      })
      .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))
  }, [
    sentimentClientId,
    sentimentPeriodFrom,
    sentimentPeriodTo,
  ])

  const sentimentDrillData = useMemo(() => {
    if (!sentimentDrill) return null
    const cell = sentimentBiweekly.find(
      (s) =>
        s.clientId === sentimentDrill.clientId &&
        s.periodEnd === sentimentDrill.periodEnd,
    )
    if (!cell) return null
    const samples = sentimentSampleSets.find(
      (s) =>
        s.clientId === sentimentDrill.clientId &&
        s.periodEnd === sentimentDrill.periodEnd,
    )
    const pairs = pairwiseSentiment.filter(
      (p) => p.clientId === sentimentDrill.clientId,
    )
    return { cell, samples, pairs }
  }, [sentimentDrill])

  return { sentimentTrend, sentimentDrillData }
}
