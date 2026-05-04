import { useMemo } from 'react'
import {
  endOfMonth,
  format,
  isBefore,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { COMMS_CATEGORIES } from '../data/mockDashboard'
import { useDashboard } from '../context/DashboardContext'

function monthOverlapsRange(monthYm: string, fromStr: string, toStr: string) {
  const fromD = parseISO(fromStr)
  const toD = parseISO(toStr)
  const mStart = startOfMonth(parseISO(`${monthYm}-01`))
  const mEnd = endOfMonth(mStart)
  return !isBefore(mEnd, fromD) && !isBefore(toD, mStart)
}

export function useProfileData(
  profileClientId: string,
  periodFrom: string,
  periodTo: string,
) {
  const { snapshot } = useDashboard()
  const clients = snapshot?.clients ?? []
  const monthlyPatternsByClient = snapshot?.monthlyPatternsByClient ?? []
  const sentimentBiweekly = snapshot?.sentimentBiweekly ?? []
  const predictedClientNeeds = snapshot?.predictedClientNeeds ?? []
  const onboardingClients = snapshot?.onboardingClients ?? []
  const pairwiseSentiment = snapshot?.pairwiseSentiment ?? []

  return useMemo(() => {
    const client = clients.find((c) => c.id === profileClientId)

    const clientSentiment = sentimentBiweekly
      .filter(
        (r) =>
          r.clientId === profileClientId &&
          r.periodEnd >= periodFrom &&
          r.periodEnd <= periodTo,
      )
      .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))

    const relevantMonths = [
      ...new Set(monthlyPatternsByClient.map((m) => m.month)),
    ]
      .filter((m) => monthOverlapsRange(m, periodFrom, periodTo))
      .sort()

    const volumeByCat = new Map<string, number>()
    for (const cat of COMMS_CATEGORIES) volumeByCat.set(cat, 0)
    for (const row of monthlyPatternsByClient) {
      if (row.clientId !== profileClientId) continue
      if (!relevantMonths.includes(row.month)) continue
      volumeByCat.set(
        row.category,
        (volumeByCat.get(row.category) ?? 0) + row.volume,
      )
    }
    const recentPatternsForClient = COMMS_CATEGORIES.map((category) => ({
      category,
      volume: volumeByCat.get(category) ?? 0,
    })).sort((a, b) => b.volume - a.volume)

    const periodLabelSummary =
      relevantMonths.length === 0
        ? null
        : relevantMonths.length === 1
          ? format(parseISO(`${relevantMonths[0]}-01`), 'MMMM yyyy')
          : `${format(parseISO(`${relevantMonths[0]}-01`), 'MMM yyyy')} – ${format(parseISO(`${relevantMonths[relevantMonths.length - 1]}-01`), 'MMM yyyy')}`

    const upcomingForClient = predictedClientNeeds
      .filter((n) => n.clientId === profileClientId)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

    const matchedOnboarding = onboardingClients.find(
      (o) =>
        client && o.clientName.toLowerCase() === client.name.toLowerCase(),
    )

    const clientPairs = pairwiseSentiment.filter(
      (p) => p.clientId === profileClientId,
    )
    const bestPairs = [...clientPairs]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
    const worstPairs = [...clientPairs]
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)

    const totalRecent = recentPatternsForClient.reduce(
      (a, x) => a + x.volume,
      0,
    )

    return {
      client,
      clientSentiment,
      recentMonth: relevantMonths.length ? relevantMonths.at(-1)! : undefined,
      periodLabelSummary,
      recentPatternsForClient,
      upcomingForClient,
      matchedOnboarding,
      bestPairs,
      worstPairs,
      totalRecent,
    }
  }, [
    profileClientId,
    periodFrom,
    periodTo,
    clients,
    monthlyPatternsByClient,
    sentimentBiweekly,
    predictedClientNeeds,
    onboardingClients,
    pairwiseSentiment,
  ])
}
