import { useMemo } from 'react'
import {
  pairwiseSentiment,
  sentimentBiweekly,
  sentimentSampleSets,
} from '../data/mockDashboard'

export function useSentimentData(opts: {
  sentimentClientId: string
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
    return sentimentBiweekly
      .filter((r) => r.clientId === sentimentClientId && inRange(r))
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
