/**
 * Single entry for mock “API” data. The UI imports from here only; later you can
 * replace imports with a fetch + the same TypeScript shapes.
 */
export {
  TASK_TYPES,
  type Client,
  type ClientContact,
  type OnboardingClient,
  type ResponseSample,
  type SentimentCell,
  type Staff,
  type TaskType,
  type TimeEntry,
  type WeeklyEmailVol,
  clientContacts,
  clients,
  demoDateRange,
  onboardingClients,
  responseByContact,
  sentimentCells,
  staff,
  teamMedianResponseMinutes,
  timeEntries,
  weeklyEmailVolume,
} from './demo'

export {
  type OnboardingDetail,
  onboardingDetailsById,
} from './onboardingDetails'

import {
  clientContacts,
  clients,
  demoDateRange,
  onboardingClients,
  responseByContact,
  sentimentCells,
  staff,
  teamMedianResponseMinutes,
  timeEntries,
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
    onboardingClients,
    onboardingDetailsById,
  }
}

/** Team-level rollup used by the response-time tab. */
export function getTeamMedianResponseMinutes(): number {
  return teamMedianResponseMinutes()
}
