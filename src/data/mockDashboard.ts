/**
 * Single entry for mock “API” data. The UI imports from here only; later you can
 * replace imports with a fetch + the same TypeScript shapes.
 */
export {
  COMMS_CATEGORIES,
  COMMS_CATEGORY_COLORS,
  TASK_TYPES,
  type Client,
  type ClientContact,
  type CommsCategory,
  type DailyResponseTime,
  type MonthlyPatternByClient,
  type OnboardingClient,
  type PairwiseSentiment,
  type PatternSample,
  type PatternTrend,
  type PredictedNeed,
  type ResponseSample,
  type SentimentBiweekly,
  type SentimentCell,
  type SentimentSampleSet,
  type Staff,
  type TaskType,
  type TimeEntry,
  type WeeklyClientInbound,
  type WeeklyEmailVol,
  clientContacts,
  clients,
  dailyResponseTimes,
  demoDateRange,
  monthlyPatternsByClient,
  onboardingClients,
  pairwiseSentiment,
  patternSamples,
  patternTrends,
  predictedClientNeeds,
  responseByContact,
  sentimentBiweekly,
  sentimentCells,
  sentimentSampleSets,
  staff,
  teamMedianResponseMinutes,
  timeEntries,
  weeklyClientInboundEmails,
  weeklyEmailVolume,
} from './demo'

export {
  type OnboardingDetail,
  onboardingDetailsById,
} from './onboardingDetails'

import {
  clientContacts,
  clients,
  dailyResponseTimes,
  demoDateRange,
  monthlyPatternsByClient,
  onboardingClients,
  pairwiseSentiment,
  patternSamples,
  patternTrends,
  predictedClientNeeds,
  responseByContact,
  sentimentBiweekly,
  sentimentCells,
  sentimentSampleSets,
  staff,
  teamMedianResponseMinutes,
  timeEntries,
  weeklyClientInboundEmails,
  weeklyEmailVolume,
} from './demo'
import { onboardingDetailsById } from './onboardingDetails'

/** One object matching a plausible backend snapshot for this dashboard. */
export type MockDashboardSnapshot = {
  dateRange: typeof demoDateRange
  clients: typeof clients
  staff: typeof staff
  timeEntries: typeof timeEntries
  clientContacts: typeof clientContacts
  responseByContact: typeof responseByContact
  sentimentCells: typeof sentimentCells
  weeklyEmailVolume: typeof weeklyEmailVolume
  dailyResponseTimes: typeof dailyResponseTimes
  weeklyClientInboundEmails: typeof weeklyClientInboundEmails
  monthlyPatternsByClient: typeof monthlyPatternsByClient
  patternTrends: typeof patternTrends
  patternSamples: typeof patternSamples
  predictedClientNeeds: typeof predictedClientNeeds
  sentimentBiweekly: typeof sentimentBiweekly
  sentimentSampleSets: typeof sentimentSampleSets
  pairwiseSentiment: typeof pairwiseSentiment
  onboardingClients: typeof onboardingClients
  onboardingDetailsById: typeof onboardingDetailsById
}

/**
 * Simulates `GET /api/dashboard` (or multiple calls merged). Swap this for
 * real fetch logic without changing UI modules.
 */
export function getMockDashboardSnapshot(): MockDashboardSnapshot {
  return {
    dateRange: demoDateRange,
    clients,
    staff,
    timeEntries,
    clientContacts,
    responseByContact,
    sentimentCells,
    weeklyEmailVolume,
    dailyResponseTimes,
    weeklyClientInboundEmails,
    monthlyPatternsByClient,
    patternTrends,
    patternSamples,
    predictedClientNeeds,
    sentimentBiweekly,
    sentimentSampleSets,
    pairwiseSentiment,
    onboardingClients,
    onboardingDetailsById,
  }
}

/** Team-level rollup used by the response-time tab. */
export function getTeamMedianResponseMinutes(): number {
  return teamMedianResponseMinutes()
}
