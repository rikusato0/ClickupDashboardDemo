/**
 * Single entry for mock “API” data. The UI imports from here only; later you can
 * replace imports with a fetch + the same TypeScript shapes.
 */
export {
  TASK_TYPES,
  type Client,
  type ClientContact,
  type DailyResponseTime,
  type OnboardingClient,
  type ResponseSample,
  type SentimentCell,
  type Staff,
  type TaskType,
  type TimeEntry,
  type WeeklyClientInbound,
  type WeeklyEmailVol,
  clientContacts,
  clients,
  dailyResponseTimes,
  demoDateRange,
  onboardingClients,
  responseByContact,
  sentimentCells,
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
  onboardingClients,
  responseByContact,
  sentimentCells,
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
    onboardingClients,
    onboardingDetailsById,
  }
}

/** Team-level rollup used by the response-time tab. */
export function getTeamMedianResponseMinutes(): number {
  return teamMedianResponseMinutes()
}
