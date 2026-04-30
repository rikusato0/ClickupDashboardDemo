import { useMemo } from 'react'
import {
  COMMS_CATEGORIES,
  clients,
  monthlyPatternsByClient,
  onboardingClients,
  pairwiseSentiment,
  predictedClientNeeds,
  sentimentBiweekly,
} from '../data/mockDashboard'

export function useProfileData(profileClientId: string) {
  return useMemo(() => {
    const client = clients.find((c) => c.id === profileClientId)
    const clientSentiment = sentimentBiweekly
      .filter((r) => r.clientId === profileClientId)
      .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))

    const recentMonth = [
      ...new Set(monthlyPatternsByClient.map((m) => m.month)),
    ].sort().slice(-1)[0]
    const recentPatternsForClient = COMMS_CATEGORIES.map((cat) => ({
      category: cat,
      volume:
        monthlyPatternsByClient.find(
          (m) =>
            m.clientId === profileClientId &&
            m.month === recentMonth &&
            m.category === cat,
        )?.volume ?? 0,
    })).sort((a, b) => b.volume - a.volume)

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
      recentMonth,
      recentPatternsForClient,
      upcomingForClient,
      matchedOnboarding,
      bestPairs,
      worstPairs,
      totalRecent,
    }
  }, [profileClientId])
}
