/**
 * Type re-exports for the dashboard. Live data comes from GET /api/dashboard.
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
  type OnboardingDetail,
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
} from '../types/dashboard'

export { onboardingDetailsById } from './onboardingDetails'

export type { DashboardSnapshot } from '../types/dashboard'
