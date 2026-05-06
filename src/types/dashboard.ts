/** Shared shapes for the dashboard UI and API responses (replaces former demo types). */

export const TASK_TYPES = [
  'One-time',
  'Recurring',
  'OT',
  'Month end',
  'Payroll',
] as const
export type TaskType = (typeof TASK_TYPES)[number]

export const COMMS_CATEGORIES = [
  'Recurring requests',
  'Seasonal events',
  'Bottlenecks',
  'Emergencies',
  'Relationship notes',
  'Ad hoc requests',
] as const
export type CommsCategory = (typeof COMMS_CATEGORIES)[number]

export const COMMS_CATEGORY_COLORS: Record<CommsCategory, string> = {
  'Recurring requests': '#06b6d4',
  'Seasonal events': '#0891b2',
  Bottlenecks: '#ff8500',
  Emergencies: '#e11d48',
  'Relationship notes': '#0e7490',
  'Ad hoc requests': '#67e8f9',
}

export interface Client {
  id: string
  name: string
  domain: string
  segment: string
  clickUpSpaceId: string
  clickUpFolderId: string
  clickUpListId: string
  accountManagerStaffId: string
  openTaskCount: number
  engagementCode: string
  /** Domains (e.g. client.com) for mapping inbound Gmail to this client. */
  emailDomains?: string[]
}

export interface Staff {
  id: string
  name: string
  initials: string
  email?: string
}

export interface TimeEntry {
  id: string
  date: string
  staffId: string
  clientId: string
  taskType: TaskType
  hours: number
  description: string
  clickUpTaskId: string
  clickUpTaskName: string
  clickUpListName?: string
}

/** Synced from ClickUp lists (structure varies per client). */
export interface ClickUpTaskSnapshot {
  id: string
  clientId: string
  clickUpListId: string
  listName: string
  name: string
  status: string
  statusType: string
  assigneeIds: string[]
  tagNames: string[]
  resolvedTaskType: TaskType | string
  dueDate: string
  url: string
}

export interface ClientContact {
  id: string
  clientId: string
  name: string
  email: string
  role: string
  priority: 'critical' | 'high' | 'standard' | 'low'
}

export interface ResponseSample {
  contactId: string
  staffId: string
  medianMinutes: number
  sampleSize: number
  lastThreadSubject: string
}

export interface SentimentCell {
  clientId: string
  windowWeeks: 2 | 4 | 8 | 12
  score: number
  volume: number
  trend: 'up' | 'down' | 'flat'
}

export interface WeeklyEmailVol {
  staffId: string
  weekStart: string
  sent: number
  received: number
  loggedHours: number
}

export interface DailyResponseTime {
  date: string
  medianMinutes: number
  sampleSize: number
}

export interface WeeklyClientInbound {
  clientId: string
  weekStart: string
  received: number
}

export interface MonthlyPatternByClient {
  clientId: string
  month: string
  category: CommsCategory
  volume: number
}

export interface PatternTrend {
  id: string
  label: string
  category: CommsCategory
  weeklyVolumes: number[]
}

export interface PatternSample {
  patternId: string
  fromContact: string
  toStaff: string
  date: string
  snippet: string
}

export interface PredictedNeed {
  id: string
  clientId: string
  dueDate: string
  title: string
  detail: string
  confidence: number
  sourcePatternId: string | null
}

export interface SentimentBiweekly {
  clientId: string
  periodEnd: string
  score: number
  msgCount: number
  topReason: string
}

export interface SentimentSampleSet {
  clientId: string
  periodEnd: string
  reasons: string[]
  excerpts: { fromName: string; date: string; snippet: string }[]
}

export interface PairwiseSentiment {
  clientId: string
  contactId: string
  staffId: string
  score: number
  msgCount: number
  note: string
}

export interface OnboardingClient {
  id: string
  clientName: string
  startDate: string
  targetGoLive: string
  ownerStaffId: string
  percentComplete: number
  stage: string
  steps: { label: string; done: boolean; owner?: string }[]
}

export interface OnboardingDetail {
  id: string
  executiveSummary: string
  milestones: {
    date: string
    label: string
    status: 'done' | 'upcoming' | 'at-risk'
  }[]
  blockers: string[]
  clientContacts: { name: string; role: string }[]
  nextSync: string
}

export interface DashboardSnapshot {
  dateRange: { start: string; end: string }
  clients: Client[]
  staff: Staff[]
  clickUpTasks: ClickUpTaskSnapshot[]
  timeEntries: TimeEntry[]
  clientContacts: ClientContact[]
  responseByContact: ResponseSample[]
  sentimentCells: SentimentCell[]
  weeklyEmailVolume: WeeklyEmailVol[]
  dailyResponseTimes: DailyResponseTime[]
  weeklyClientInboundEmails: WeeklyClientInbound[]
  monthlyPatternsByClient: MonthlyPatternByClient[]
  patternTrends: PatternTrend[]
  patternSamples: PatternSample[]
  predictedClientNeeds: PredictedNeed[]
  sentimentBiweekly: SentimentBiweekly[]
  sentimentSampleSets: SentimentSampleSet[]
  pairwiseSentiment: PairwiseSentiment[]
  onboardingClients: OnboardingClient[]
  onboardingDetailsById: Record<string, OnboardingDetail>
}
