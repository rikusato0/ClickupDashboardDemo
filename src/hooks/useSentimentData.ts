import { useMemo } from 'react'
import {
  pairwiseSentiment,
  sentimentBiweekly,
  sentimentSampleSets,
} from '../data/mockDashboard'

export function useSentimentData(opts: {
  sentimentClientId: string
  sentimentDrill: { clientId: string; periodEnd: string } | null
}) {
  const { sentimentClientId, sentimentDrill } = opts

  const sentimentTrend = useMemo(() => {
    return sentimentBiweekly
      .filter((r) => r.clientId === sentimentClientId)
      .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))
  }, [sentimentClientId])

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
