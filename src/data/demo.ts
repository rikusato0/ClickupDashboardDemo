import {
  eachDayOfInterval,
  format,
  parseISO,
  subDays,
  subWeeks,
} from 'date-fns'

export const TASK_TYPES = [
  'One-time',
  'Recurring',
  'OT',
  'Month end',
  'Payroll',
] as const
export type TaskType = (typeof TASK_TYPES)[number]

export interface Client {
  id: string
  name: string
  domain: string
  /** Industry / vertical — often synced from a ClickUp custom field. */
  segment: string
  /** Demo IDs in ClickUp shape (space / folder / list). */
  clickUpSpaceId: string
  clickUpFolderId: string
  clickUpListId: string
  /** Lead assignee in the firm (ClickUp member). */
  accountManagerStaffId: string
  /** Open tasks in the client list — typical rollup from ClickUp. */
  openTaskCount: number
  /** Engagement reference on billing / SOW. */
  engagementCode: string
}

export interface Staff {
  id: string
  name: string
  initials: string
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
  /** Mirrors the task name shown in ClickUp. */
  clickUpTaskName: string
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

/**
 * One row per weekday for the last ~6 months. `medianMinutes` is the team-wide
 * median first-response time across all client contacts for that day. The
 * generator fakes a slowly-improving trend (bookkeeping firm tightening up
 * its SLA) plus day-of-week and noise effects so the chart actually has a
 * shape to discuss in demos.
 */
export interface DailyResponseTime {
  date: string
  medianMinutes: number
  sampleSize: number
}

/**
 * Per-client, per-week count of inbound emails the firm received from that
 * client. Drives the "how much are clients pinging us?" view on the email
 * volume sub-tab.
 */
export interface WeeklyClientInbound {
  clientId: string
  weekStart: string
  received: number
}

/**
 * Communication-pattern taxonomy used to label inbound traffic from clients.
 * "Ad hoc requests" replaces what was previously called "standard
 * communication" — non-recurring one-off questions whose volume is itself
 * a signal (when a client's ad-hoc bucket grows quickly the firm should
 * consider promoting an item to a recurring service).
 */
export const COMMS_CATEGORIES = [
  'Recurring requests',
  'Seasonal events',
  'Bottlenecks',
  'Urgencies',
  'Relationship notes',
  'Ad hoc requests',
] as const
export type CommsCategory = (typeof COMMS_CATEGORIES)[number]

export const COMMS_CATEGORY_COLORS: Record<CommsCategory, string> = {
  'Recurring requests': '#06b6d4',
  'Seasonal events': '#0891b2',
  Bottlenecks: '#ff8500',
  Urgencies: '#e11d48',
  'Relationship notes': '#0e7490',
  'Ad hoc requests': '#67e8f9',
}

export interface MonthlyPatternByClient {
  clientId: string
  /** ISO yyyy-MM */
  month: string
  category: CommsCategory
  volume: number
}

export interface PatternTrend {
  id: string
  label: string
  category: CommsCategory
  /** 12 weekly counts, oldest-first. */
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
  /** yyyy-MM-dd */
  dueDate: string
  title: string
  detail: string
  /** 0..1 confidence emitted by the predictor. */
  confidence: number
  sourcePatternId: string | null
}

export interface SentimentBiweekly {
  clientId: string
  /** Last day of the bi-weekly window, yyyy-MM-dd. */
  periodEnd: string
  /** -1..+1 */
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

/**
 * Firm-employee × client-contact sentiment so the UI can answer "Aaron at
 * the client loves Eric on our side but is frustrated with Sam".
 */
export interface PairwiseSentiment {
  clientId: string
  contactId: string
  staffId: string
  /** -1..+1 */
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

export const clients: Client[] = [
  {
    id: 'c1',
    name: 'Northbridge LLP',
    domain: 'northbridge-law.com',
    segment: 'Professional services',
    clickUpSpaceId: '90120143102418',
    clickUpFolderId: '90120488110233',
    clickUpListId: '90120622044112',
    accountManagerStaffId: 'e1',
    openTaskCount: 24,
    engagementCode: 'WL-NB-2024-118',
  },
  {
    id: 'c2',
    name: 'Harborview Clinics',
    domain: 'harborviewcare.org',
    segment: 'Healthcare',
    clickUpSpaceId: '90120143102419',
    clickUpFolderId: '90120488110240',
    clickUpListId: '90120622044128',
    accountManagerStaffId: 'e4',
    openTaskCount: 31,
    engagementCode: 'WL-HV-2025-006',
  },
  {
    id: 'c3',
    name: 'Cedar & Co. Retail',
    domain: 'cedarretail.co',
    segment: 'Retail',
    clickUpSpaceId: '90120143102422',
    clickUpFolderId: '90120488110251',
    clickUpListId: '90120622044135',
    accountManagerStaffId: 'e2',
    openTaskCount: 18,
    engagementCode: 'WL-CD-2024-442',
  },
  {
    id: 'c4',
    name: 'Ironworks Foundry',
    domain: 'ironworks-ind.com',
    segment: 'Manufacturing',
    clickUpSpaceId: '90120143102427',
    clickUpFolderId: '90120488110266',
    clickUpListId: '90120622044151',
    accountManagerStaffId: 'e5',
    openTaskCount: 42,
    engagementCode: 'WL-IW-2023-901',
  },
  {
    id: 'c5',
    name: 'Brightline SaaS',
    domain: 'brightlineapp.io',
    segment: 'Technology',
    clickUpSpaceId: '90120143102431',
    clickUpFolderId: '90120488110272',
    clickUpListId: '90120622044167',
    accountManagerStaffId: 'e3',
    openTaskCount: 56,
    engagementCode: 'WL-BL-2025-214',
  },
  {
    id: 'c6',
    name: 'Pelican Hospitality',
    domain: 'pelicanhosp.com',
    segment: 'Hospitality',
    clickUpSpaceId: '90120143102435',
    clickUpFolderId: '90120488110288',
    clickUpListId: '90120622044174',
    accountManagerStaffId: 'e7',
    openTaskCount: 27,
    engagementCode: 'WL-PL-2024-089',
  },
  {
    id: 'c7',
    name: 'Maple Street Credit Union',
    domain: 'maplestcu.org',
    segment: 'Financial services',
    clickUpSpaceId: '90120143102439',
    clickUpFolderId: '90120488110294',
    clickUpListId: '90120622044181',
    accountManagerStaffId: 'e1',
    openTaskCount: 33,
    engagementCode: 'WL-MS-2024-330',
  },
  {
    id: 'c8',
    name: 'Vertex Robotics',
    domain: 'vertexrobotics.tech',
    segment: 'Technology',
    clickUpSpaceId: '90120143102444',
    clickUpFolderId: '90120488110301',
    clickUpListId: '90120622044190',
    accountManagerStaffId: 'e6',
    openTaskCount: 21,
    engagementCode: 'WL-VR-2025-102',
  },
  {
    id: 'c9',
    name: 'Olive & Finch Foods',
    domain: 'olivefinchfoods.com',
    segment: 'Food & beverage',
    clickUpSpaceId: '90120143102448',
    clickUpFolderId: '90120488110318',
    clickUpListId: '90120622044204',
    accountManagerStaffId: 'e8',
    openTaskCount: 15,
    engagementCode: 'WL-OF-2024-277',
  },
  {
    id: 'c10',
    name: 'Summit Charter Schools',
    domain: 'summitcharter.edu',
    segment: 'Education',
    clickUpSpaceId: '90120143102452',
    clickUpFolderId: '90120488110325',
    clickUpListId: '90120622044211',
    accountManagerStaffId: 'e4',
    openTaskCount: 29,
    engagementCode: 'WL-SC-2023-615',
  },
]

export const staff: Staff[] = [
  { id: 'e1', name: 'Morgan Reyes', initials: 'MR' },
  { id: 'e2', name: 'Casey Okonkwo', initials: 'CO' },
  { id: 'e3', name: 'Riley Nakamura', initials: 'RN' },
  { id: 'e4', name: 'Jamie Patel', initials: 'JP' },
  { id: 'e5', name: 'Alex Rivera', initials: 'AR' },
  { id: 'e6', name: 'Taylor Brooks', initials: 'TB' },
  { id: 'e7', name: 'Jordan Kim', initials: 'JK' },
  { id: 'e8', name: 'Sam Okafor', initials: 'SO' },
  { id: 'e9', name: 'Drew Mitchell', initials: 'DM' },
  { id: 'e10', name: 'Avery Costa', initials: 'AC' },
  { id: 'e11', name: 'Quinn Hart', initials: 'QH' },
  { id: 'e12', name: 'Reese Lindqvist', initials: 'RL' },
]

/** Deterministic pseudo-random for stable demo data */
function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0
  return Math.abs(h) + 1
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const demoStart = new Date('2026-03-01T12:00:00')
const demoEnd = new Date('2026-04-28T12:00:00')

function genTimeEntries(): TimeEntry[] {
  const days = eachDayOfInterval({ start: demoStart, end: demoEnd }).filter(
    (d) => d.getDay() !== 0 && d.getDay() !== 6,
  )
  const entries: TimeEntry[] = []
  let nid = 1
  const descPool = [
    'Reconciliations',
    'Sales tax filing prep',
    'Payroll review',
    'Client call — escalation',
    'Q1 close support',
    'Board package',
    '1099 corrections',
    'Integration mapping',
    'Policy memo',
    'Expense audit',
  ]
  const taskTitlePool = [
    'Month-end close checklist',
    'Operating account reconciliation',
    'Payroll registry tie-out',
    'Sales tax worksheet',
    'Expense audit — corporate card',
    'Grant revenue schedule',
    'Wire approval workflow',
    'Fixed assets — additions',
    'QBR prep — finance deck',
    'Provider integration follow-up',
    'Intercompany tie-out',
    'Cash forecast refresh',
    'Audit PBC request',
    'Loan covenant workbook',
  ]

  for (const s of staff) {
    const rng = mulberry32(hashSeed(`staff-${s.id}`))
    for (const day of days) {
      if (rng() < 0.05) continue
      const n = 1 + Math.floor(rng() * 5)
      for (let i = 0; i < n; i++) {
        const c = clients[Math.floor(rng() * clients.length)]!
        const tt = TASK_TYPES[Math.floor(rng() * TASK_TYPES.length)]!
        const h = Math.round((0.25 + rng() * 2.75) * 4) / 4
        const taskTitle =
          taskTitlePool[Math.floor(rng() * taskTitlePool.length)]!
        entries.push({
          id: `te-${nid++}`,
          date: format(day, 'yyyy-MM-dd'),
          staffId: s.id,
          clientId: c.id,
          taskType: tt,
          hours: h,
          description: descPool[Math.floor(rng() * descPool.length)]!,
          clickUpTaskId: `${100000 + Math.floor(rng() * 899999)}`,
          clickUpTaskName: `${taskTitle} · ${c.name}`,
        })
      }
    }
  }
  return entries
}

export const timeEntries = genTimeEntries()

export const clientContacts: ClientContact[] = [
  { id: 'p1', clientId: 'c1', name: 'Elena Voss', email: 'evoss@northbridge-law.com', role: 'Executive Director', priority: 'critical' },
  { id: 'p2', clientId: 'c1', name: 'Marcus Cole', email: 'mcole@northbridge-law.com', role: 'Controller', priority: 'high' },
  { id: 'p3', clientId: 'c1', name: 'Ana Gutierrez', email: 'agutierrez@northbridge-law.com', role: 'Staff Accountant', priority: 'standard' },
  { id: 'p4', clientId: 'c2', name: 'Priya Shah', email: 'pshah@harborviewcare.org', role: 'Executive Director', priority: 'critical' },
  { id: 'p5', clientId: 'c2', name: 'Leo Martinez', email: 'lmartinez@harborviewcare.org', role: 'Finance Manager', priority: 'high' },
  { id: 'p6', clientId: 'c2', name: 'Chris Wu', email: 'cwu@harborviewcare.org', role: 'AP Specialist', priority: 'low' },
  { id: 'p7', clientId: 'c3', name: 'Dana Frost', email: 'dfrost@cedarretail.co', role: 'Owner / CEO', priority: 'critical' },
  { id: 'p8', clientId: 'c3', name: 'Imani Bell', email: 'ibell@cedarretail.co', role: 'Bookkeeper', priority: 'standard' },
  { id: 'p9', clientId: 'c4', name: 'Victor Han', email: 'vhan@ironworks-ind.com', role: 'Plant CFO', priority: 'high' },
  { id: 'p10', clientId: 'c4', name: 'Nina Popov', email: 'npopov@ironworks-ind.com', role: 'Payroll Admin', priority: 'standard' },
  { id: 'p11', clientId: 'c5', name: 'Sloane Avery', email: 'savery@brightlineapp.io', role: 'Executive Director', priority: 'critical' },
  { id: 'p12', clientId: 'c5', name: 'Omar Haddad', email: 'ohaddad@brightlineapp.io', role: 'VP Finance', priority: 'high' },
  { id: 'p13', clientId: 'c6', name: 'Rosa Delgado', email: 'rdelgado@pelicanhosp.com', role: 'Regional Controller', priority: 'high' },
  { id: 'p14', clientId: 'c6', name: 'Will Tan', email: 'wtan@pelicanhosp.com', role: 'Ops Manager', priority: 'standard' },
  { id: 'p15', clientId: 'c7', name: 'Grace Olsen', email: 'golsen@maplestcu.org', role: 'Executive Director', priority: 'critical' },
  { id: 'p16', clientId: 'c7', name: 'Ben Cho', email: 'bcho@maplestcu.org', role: 'Compliance Officer', priority: 'high' },
  { id: 'p17', clientId: 'c8', name: 'Helena Ruiz', email: 'hruiz@vertexrobotics.tech', role: 'CEO', priority: 'critical' },
  { id: 'p18', clientId: 'c8', name: 'Theo Singh', email: 'tsingh@vertexrobotics.tech', role: 'Engineering PM', priority: 'standard' },
  { id: 'p19', clientId: 'c9', name: 'Marisol Vega', email: 'mvega@olivefinchfoods.com', role: 'Owner', priority: 'critical' },
  { id: 'p20', clientId: 'c9', name: 'Ken Walsh', email: 'kwalsh@olivefinchfoods.com', role: 'Warehouse Lead', priority: 'low' },
  { id: 'p21', clientId: 'c10', name: 'Dr. Amara Nwosu', email: 'anwosu@summitcharter.edu', role: 'Superintendent', priority: 'critical' },
  { id: 'p22', clientId: 'c10', name: 'Felix Brandt', email: 'fbrandt@summitcharter.edu', role: 'Business Manager', priority: 'high' },
  { id: 'p23', clientId: 'c4', name: 'Jake Morrison', email: 'jmorrison@ironworks-ind.com', role: 'Ops Controller', priority: 'standard' },
  { id: 'p24', clientId: 'c5', name: 'Priya Menon', email: 'pmenon@brightlineapp.io', role: 'Revenue Accountant', priority: 'standard' },
  { id: 'p25', clientId: 'c7', name: 'Luis Ríos', email: 'lrios@maplestcu.org', role: 'Treasurer', priority: 'high' },
]

export const responseByContact: ResponseSample[] = clientContacts.flatMap((contact, idx) => {
  const rng = mulberry32(hashSeed(`resp-${contact.id}`))
  const picks = staff.slice(0, 8)
  return picks.map((st, j) => {
    let base = 25 + Math.floor(rng() * 180)
    if (contact.priority === 'critical') base = Math.min(base, 95)
    if (contact.priority === 'low') base += 40
    base += j * 7 + (idx % 5) * 3
    const subjects = [
      'RE: Month-end flux',
      'FW: Board materials',
      'Quick question — payroll',
      'Urgent: wire approval',
      'RE: Policy update',
    ]
    return {
      contactId: contact.id,
      staffId: st.id,
      medianMinutes: base,
      sampleSize: 6 + Math.floor(rng() * 22),
      lastThreadSubject: subjects[Math.floor(rng() * subjects.length)]!,
    }
  })
})

export function teamMedianResponseMinutes(): number {
  const vals = responseByContact.map((r) => r.medianMinutes).sort((a, b) => a - b)
  const mid = Math.floor(vals.length / 2)
  return vals.length % 2 ? vals[mid]! : (vals[mid - 1]! + vals[mid]!) / 2
}

const windows = [2, 4, 8, 12] as const

export const sentimentCells: SentimentCell[] = clients.flatMap((c) =>
  windows.map((w) => {
    const rng = mulberry32(hashSeed(`sent-${c.id}-w${w}`))
    const score = Math.round((rng() * 0.9 + (w === 12 ? 0.05 : 0) - (rng() > 0.55 ? 0.15 : 0)) * 100) / 100
    const volume = 12 + Math.floor(rng() * 140)
    const trend = rng() > 0.55 ? 'up' : rng() > 0.35 ? 'flat' : 'down'
    return {
      clientId: c.id,
      windowWeeks: w,
      score,
      volume,
      trend,
    }
  }),
)

export const weeklyEmailVolume: WeeklyEmailVol[] = (() => {
  const out: WeeklyEmailVol[] = []
  for (let w = 11; w >= 0; w--) {
    const ws = format(subWeeks(new Date('2026-04-28'), w), 'yyyy-MM-dd')
    for (const s of staff) {
      const rng = mulberry32(hashSeed(`em-${s.id}-${ws}`))
      const sent = 14 + Math.floor(rng() * 85)
      const received = 28 + Math.floor(rng() * 120)
      const loggedHours = 28 + rng() * 18
      out.push({ staffId: s.id, weekStart: ws, sent, received, loggedHours })
    }
  }
  return out
})()

export const onboardingClients: OnboardingClient[] = [
  {
    id: 'ob1',
    clientName: 'Lumen Analytics Group',
    startDate: '2026-04-02',
    targetGoLive: '2026-05-30',
    ownerStaffId: 'e1',
    percentComplete: 62,
    stage: 'System mapping',
    steps: [
      { label: 'Engagement letter signed', done: true },
      { label: 'Chart of accounts import', done: true },
      { label: 'Bank & card feeds', done: true, owner: 'Client' },
      { label: 'Payroll provider bridge', done: false, owner: 'Morgan Reyes' },
      { label: 'First shadow close', done: false },
      { label: 'Go-live checklist', done: false },
    ],
  },
  {
    id: 'ob2',
    clientName: 'Redwood Dental Collective',
    startDate: '2026-03-18',
    targetGoLive: '2026-06-15',
    ownerStaffId: 'e4',
    percentComplete: 44,
    stage: 'Data migration',
    steps: [
      { label: 'Kickoff & RACI', done: true },
      { label: 'Historical trial balance', done: true },
      { label: 'Patient billing mapping', done: false },
      { label: 'Entity structure in GL', done: false },
      { label: 'Training sessions', done: false },
    ],
  },
  {
    id: 'ob3',
    clientName: 'Cascade Freight Lines',
    startDate: '2026-04-12',
    targetGoLive: '2026-07-01',
    ownerStaffId: 'e2',
    percentComplete: 28,
    stage: 'Discovery',
    steps: [
      { label: 'SOW complete', done: true },
      { label: 'Driver pay rules doc', done: false },
      { label: 'Fuel card policies', done: false },
      { label: 'Multi-entity map', done: false },
    ],
  },
  {
    id: 'ob4',
    clientName: 'Willow Ridge HOA',
    startDate: '2026-02-24',
    targetGoLive: '2026-05-01',
    ownerStaffId: 'e7',
    percentComplete: 88,
    stage: 'Shadow close',
    steps: [
      { label: 'Assessments in system', done: true },
      { label: 'Vendor 1099 history', done: true },
      { label: 'Reserve study tie-out', done: true },
      { label: 'Final sign-off', done: false },
    ],
  },
  {
    id: 'ob5',
    clientName: 'NovaForm Studios',
    startDate: '2026-04-20',
    targetGoLive: '2026-08-10',
    ownerStaffId: 'e10',
    percentComplete: 15,
    stage: 'Intake',
    steps: [
      { label: 'Secure portal access', done: true },
      { label: 'Prior-year binder', done: false },
      { label: 'Grant revenue model', done: false },
    ],
  },
  {
    id: 'ob6',
    clientName: 'Keystone Municipal Partners',
    startDate: '2026-01-08',
    targetGoLive: '2026-04-30',
    ownerStaffId: 'e3',
    percentComplete: 100,
    stage: 'Complete',
    steps: [
      { label: 'All milestones', done: true },
      { label: 'Postmortem scheduled', done: true },
    ],
  },
]

/** ~6 months of daily team-median response times, weekdays only. */
export const dailyResponseTimes: DailyResponseTime[] = (() => {
  const end = demoEnd
  const start = subDays(end, 180)
  const days = eachDayOfInterval({ start, end }).filter(
    (d) => d.getDay() !== 0 && d.getDay() !== 6,
  )
  const total = days.length
  return days.map((d, i) => {
    const rng = mulberry32(hashSeed(`drt-${format(d, 'yyyy-MM-dd')}`))
    const t = total > 1 ? i / (total - 1) : 0
    // 6 months ago: ~210 min · today: ~95 min — slow improvement curve.
    const trend = 210 - t * 115
    const dow = d.getDay()
    const dowAdj =
      dow === 1 ? 28 : dow === 2 ? 14 : dow === 4 ? -6 : dow === 5 ? -18 : 0
    // Occasional bad days so the line isn't perfectly smooth.
    const spike = rng() < 0.07 ? 60 + rng() * 90 : 0
    const noise = (rng() - 0.5) * 38
    const median = Math.max(18, Math.round(trend + dowAdj + spike + noise))
    return {
      date: format(d, 'yyyy-MM-dd'),
      medianMinutes: median,
      sampleSize: 22 + Math.floor(rng() * 58),
    }
  })
})()

/** Per-client weekly inbound email counts, last 12 weeks. */
export const weeklyClientInboundEmails: WeeklyClientInbound[] = (() => {
  const out: WeeklyClientInbound[] = []
  for (let w = 11; w >= 0; w--) {
    const ws = format(subWeeks(demoEnd, w), 'yyyy-MM-dd')
    for (const c of clients) {
      const rng = mulberry32(hashSeed(`inb-${c.id}-${ws}`))
      // High-touch clients get more inbound; weekly noise + slight upward drift.
      const heavy =
        c.id === 'c1' || c.id === 'c2' || c.id === 'c4' || c.id === 'c7'
      const base = (heavy ? 70 : 32) + Math.floor(rng() * (heavy ? 60 : 35))
      const drift = Math.round((11 - w) * (heavy ? 1.4 : 0.6))
      out.push({
        clientId: c.id,
        weekStart: ws,
        received: Math.max(0, base + drift),
      })
    }
  }
  return out
})()

/** Top recurring/seasonal/etc named patterns the AI surfaces. */
const PATTERN_TRENDS_DEFS: {
  id: string
  label: string
  category: CommsCategory
  baseline: number
  growth: number
}[] = [
  { id: 'pat-stax', label: 'Sales-tax filing prep', category: 'Recurring requests', baseline: 22, growth: 0.5 },
  { id: 'pat-bank', label: 'Bank-feed reconciliations', category: 'Recurring requests', baseline: 30, growth: -0.2 },
  { id: 'pat-close', label: 'Month-end close support', category: 'Seasonal events', baseline: 18, growth: 1.2 },
  { id: 'pat-1099', label: 'Year-end 1099 cleanup', category: 'Seasonal events', baseline: 8, growth: 0.4 },
  { id: 'pat-payroll', label: 'Payroll provider bridge issues', category: 'Bottlenecks', baseline: 12, growth: 0.6 },
  { id: 'pat-wire', label: 'Wire approval delays', category: 'Urgencies', baseline: 6, growth: 0.3 },
  { id: 'pat-rel', label: 'Owner / ED relationship check-ins', category: 'Relationship notes', baseline: 10, growth: -0.1 },
  { id: 'pat-adhoc', label: 'Random Q&A from contacts', category: 'Ad hoc requests', baseline: 28, growth: 0.8 },
]

export const patternTrends: PatternTrend[] = PATTERN_TRENDS_DEFS.map((p) => {
  const rng = mulberry32(hashSeed(`pat-${p.id}`))
  const weekly: number[] = []
  for (let w = 0; w < 12; w++) {
    const drift = w * p.growth
    const noise = (rng() - 0.5) * (p.baseline * 0.4)
    weekly.push(Math.max(0, Math.round(p.baseline + drift + noise)))
  }
  return { id: p.id, label: p.label, category: p.category, weeklyVolumes: weekly }
})

export const monthlyPatternsByClient: MonthlyPatternByClient[] = (() => {
  const out: MonthlyPatternByClient[] = []
  for (let m = 5; m >= 0; m--) {
    const monthDate = subWeeks(demoEnd, m * 4)
    const month = format(monthDate, 'yyyy-MM')
    for (const c of clients) {
      const rng = mulberry32(hashSeed(`mp-${c.id}-${month}`))
      const heavy =
        c.id === 'c1' || c.id === 'c2' || c.id === 'c4' || c.id === 'c7'
      for (const cat of COMMS_CATEGORIES) {
        let base =
          (heavy ? 22 : 9) + Math.floor(rng() * (heavy ? 18 : 10))
        if (cat === 'Urgencies' && (c.id === 'c2' || c.id === 'c8')) base += 6
        if (cat === 'Recurring requests' && heavy) base += 4
        if (cat === 'Ad hoc requests') base += Math.floor(rng() * 8)
        out.push({ clientId: c.id, month, category: cat, volume: base })
      }
    }
  }
  return out
})()

const PATTERN_SAMPLE_SNIPPETS: Record<string, string[]> = {
  'pat-stax': [
    'Heads up — quarterly filing window opens next week. Want to sync on the latest figures?',
    'Quick reminder: sales tax for Q1 is due April 30. Can we confirm the schedule?',
    'Got the worksheet. Two line items look off vs last quarter, can you double-check?',
  ],
  'pat-bank': [
    "Two transactions on the operating account aren't mapping — want me to forward the screenshots?",
    "Bank feed dropped overnight. We're seeing duplicates — can you re-run the reconciliation?",
    'Reconciled through Apr 25. Variance is $312, sourcing it now.',
  ],
  'pat-close': [
    'May close kickoff — restricted fund reporting + event revenue coding will be the bigger lifts.',
    'Need to lock the close calendar. Targeting Jun 5 — does that work for the team?',
    'Two journal entries to review before we cut the package.',
  ],
  'pat-1099': [
    'Vendor list updated, please regenerate corrections for Acme Co and Cedar Vendors.',
    '1099-NEC for the contractor pool needs the new TIN before we file.',
    "Waiting on three W-9s — will forward as they come in.",
  ],
  'pat-payroll': [
    'Payroll bridge throwing a 502 again. Third time this month.',
    'Need someone to look at the pay-period mapping — hours are duplicating.',
    "Provider says it's on our side. Can you get on a call with them?",
  ],
  'pat-wire': [
    'Wire approval is sitting in your queue — vendor needs payment by EOD.',
    'Urgent: the EUR transfer for the Berlin office is timing out.',
    "Approver is OOO — what's the fallback workflow?",
  ],
  'pat-rel': [
    'Loved the proactive board package — saved me a few hours this week.',
    'Just a check-in — anything we should be doing differently from your side?',
    'Thanks for the heads up on the cash position. Owner appreciated the call.',
  ],
  'pat-adhoc': [
    'Random one — does the policy memo need a sign-off from legal first?',
    'Question on expense classification for the conference last week.',
    'Anyone know how to update the SSO policy? Asking for our HR person.',
  ],
}

export const patternSamples: PatternSample[] = (() => {
  const out: PatternSample[] = []
  for (const p of patternTrends) {
    const rng = mulberry32(hashSeed(`ps-${p.id}`))
    const snippets = PATTERN_SAMPLE_SNIPPETS[p.id] ?? []
    for (const snippet of snippets) {
      const contact =
        clientContacts[Math.floor(rng() * clientContacts.length)]!
      const st = staff[Math.floor(rng() * 6)]!
      const daysAgo = 1 + Math.floor(rng() * 42)
      out.push({
        patternId: p.id,
        fromContact: contact.name,
        toStaff: st.name,
        date: format(subDays(demoEnd, daysAgo), 'yyyy-MM-dd'),
        snippet,
      })
    }
  }
  return out
})()

const PREDICTED_NEEDS_DEFS: {
  id: string
  clientId: string
  daysAhead: number
  title: string
  detail: string
  confidence: number
  sourcePatternId: string | null
}[] = [
  { id: 'pn1', clientId: 'c1', daysAhead: 38, title: 'May close', detail: 'Event revenue coding + restricted fund reporting due Jun 5.', confidence: 0.92, sourcePatternId: 'pat-close' },
  { id: 'pn2', clientId: 'c5', daysAhead: 34, title: 'Q2 close kickoff package', detail: 'SaaS revenue rec checklist; deferred revenue rollforward.', confidence: 0.84, sourcePatternId: 'pat-close' },
  { id: 'pn3', clientId: 'c4', daysAhead: 17, title: 'Quarterly sales-tax filing', detail: 'Manufacturing carve-outs always need a second pass.', confidence: 0.95, sourcePatternId: 'pat-stax' },
  { id: 'pn4', clientId: 'c8', daysAhead: 24, title: '1099 corrections review', detail: 'Two contractors flagged with new TINs since last cycle.', confidence: 0.78, sourcePatternId: 'pat-1099' },
  { id: 'pn5', clientId: 'c4', daysAhead: 4, title: 'Payroll bridge weekly sync', detail: 'Recurring 502s — schedule recurring Mon 10am call.', confidence: 0.88, sourcePatternId: 'pat-payroll' },
  { id: 'pn6', clientId: 'c3', daysAhead: 32, title: 'Vendor 1099 cleanup', detail: 'Retail vendor list expanded — pre-clean now to avoid Q4 crunch.', confidence: 0.71, sourcePatternId: 'pat-1099' },
  { id: 'pn7', clientId: 'c10', daysAhead: 43, title: 'Restricted fund grant report', detail: 'Education-grant tranche reporting due to state.', confidence: 0.83, sourcePatternId: 'pat-close' },
  { id: 'pn8', clientId: 'c1', daysAhead: 30, title: 'Year-end audit prep readiness check', detail: 'External auditor kickoff in early Q3 — gather PBC list.', confidence: 0.74, sourcePatternId: null },
  { id: 'pn9', clientId: 'c2', daysAhead: 40, title: 'Wire-approval workflow audit', detail: 'Three urgent wires last month — propose dual-signer flow.', confidence: 0.68, sourcePatternId: 'pat-wire' },
  { id: 'pn10', clientId: 'c7', daysAhead: 36, title: 'Board package — quarterly', detail: 'Compliance officer typically asks for footnotes 2d before send.', confidence: 0.82, sourcePatternId: 'pat-rel' },
  { id: 'pn11', clientId: 'c6', daysAhead: 12, title: 'Multi-property roll-up', detail: 'Hospitality group adds Q3 properties — schedule new GL mapping.', confidence: 0.66, sourcePatternId: null },
  { id: 'pn12', clientId: 'c9', daysAhead: 20, title: 'Owner relationship touch-base', detail: 'Owner sentiment trending neutral — proactive call recommended.', confidence: 0.61, sourcePatternId: 'pat-rel' },
  { id: 'pn13', clientId: 'c1', daysAhead: 52, title: 'Restricted grant compliance attestation', detail: 'State funder requires signed attestation before July board meeting.', confidence: 0.79, sourcePatternId: null },
  { id: 'pn14', clientId: 'c2', daysAhead: 11, title: 'Medicaid cost report draft', detail: 'Draft due to CFO Friday; tie payroll fringes to cost centers.', confidence: 0.91, sourcePatternId: 'pat-close' },
  { id: 'pn15', clientId: 'c3', daysAhead: 48, title: 'Multi-store inventory true-up', detail: 'Perpetual vs physical variance — schedule cycle count script.', confidence: 0.73, sourcePatternId: 'pat-bank' },
  { id: 'pn16', clientId: 'c6', daysAhead: 26, title: 'Franchise fee true-up (Q2)', detail: 'Pelican brand agreement triggers quarterly true-up worksheet.', confidence: 0.87, sourcePatternId: 'pat-stax' },
  { id: 'pn17', clientId: 'c7', daysAhead: 55, title: 'NCUA call report dry run', detail: 'Parallel run against new allowance model before live filing.', confidence: 0.81, sourcePatternId: null },
  { id: 'pn18', clientId: 'c8', daysAhead: 33, title: 'R&D credit documentation sprint', detail: 'Engineering time surveys due before tax provision lock.', confidence: 0.76, sourcePatternId: null },
  { id: 'pn19', clientId: 'c10', daysAhead: 14, title: 'Title I grant carryover', detail: 'Carryover request must post before new fiscal year opening.', confidence: 0.89, sourcePatternId: 'pat-close' },
  { id: 'pn20', clientId: 'c5', daysAhead: 7, title: 'ARR rollforward sign-off', detail: 'Deferred revenue bridge needs VP Finance approval for board.', confidence: 0.93, sourcePatternId: 'pat-close' },
]

export const predictedClientNeeds: PredictedNeed[] = PREDICTED_NEEDS_DEFS.map(
  (p) => ({
    id: p.id,
    clientId: p.clientId,
    dueDate: format(subDays(demoEnd, -p.daysAhead), 'yyyy-MM-dd'),
    title: p.title,
    detail: p.detail,
    confidence: p.confidence,
    sourcePatternId: p.sourcePatternId,
  }),
)

const SENT_REASONS_POOL = [
  '4 reminders sent by client without staff reply in last 14 days',
  'Two escalation threads routed to Executive Director',
  'Response time exceeded 3h on critical-priority threads',
  'Multiple staff on copy without action',
  'Positive language ("thanks", "great work") in 3 of 5 threads',
  'Client expressed appreciation for proactive close timing',
  'Bottleneck on payroll bridge mentioned 3 times',
  'Owner asked the same question twice in one week',
  'Wire approval delay flagged as a recurring concern',
  'Praised proactive board package delivery',
  'AP specialist sentiment dipped after 2 missed deadlines',
  'Long thread (> 20 replies) — sign of stuck workflow',
]

const SENT_EXCERPTS_POOL = [
  'Hey team — checking in on the May close. Can we hit the 5th?',
  "Frustrated that this is the 3rd time we've asked about the wire approval.",
  'Thanks for the heads up on the bank feed issue, super helpful.',
  'Can we please get a status update on the 1099 corrections by EOD?',
  'Loved the proactive board package — saved me hours.',
  'This keeps falling through the cracks. Please loop me in.',
  "Quick question on payroll routing — when's the best time to chat?",
  'Great work on the close — 2 days ahead of schedule.',
  'Why is this still open? I escalated this last week.',
  'Appreciate the proactive email about the cash position.',
]

export const sentimentBiweekly: SentimentBiweekly[] = (() => {
  const out: SentimentBiweekly[] = []
  for (let p = 11; p >= 0; p--) {
    const periodEnd = format(subWeeks(demoEnd, p * 2), 'yyyy-MM-dd')
    for (const c of clients) {
      const rng = mulberry32(hashSeed(`sb-${c.id}-${periodEnd}`))
      const slope =
        c.id === 'c2'
          ? -0.04
          : c.id === 'c4'
            ? -0.05
            : c.id === 'c5'
              ? 0.06
              : c.id === 'c7'
                ? 0.03
                : 0
      const baseline =
        c.id === 'c2'
          ? 0.35
          : c.id === 'c4'
            ? 0.2
            : c.id === 'c8'
              ? -0.2
              : c.id === 'c5'
                ? -0.05
                : 0.1
      const score = Math.max(
        -0.95,
        Math.min(
          0.95,
          baseline + slope * (11 - p) + (rng() - 0.5) * 0.18,
        ),
      )
      const msgCount = 18 + Math.floor(rng() * 64)
      const topReason =
        SENT_REASONS_POOL[Math.floor(rng() * SENT_REASONS_POOL.length)]!
      out.push({
        clientId: c.id,
        periodEnd,
        score: Math.round(score * 100) / 100,
        msgCount,
        topReason,
      })
    }
  }
  return out
})()

export const sentimentSampleSets: SentimentSampleSet[] = sentimentBiweekly.map(
  (row) => {
    const rng = mulberry32(hashSeed(`ss-${row.clientId}-${row.periodEnd}`))
    const reasonsPool = [...SENT_REASONS_POOL]
    const reasons: string[] = []
    while (reasons.length < 3 && reasonsPool.length > 0) {
      const idx = Math.floor(rng() * reasonsPool.length)
      reasons.push(reasonsPool[idx]!)
      reasonsPool.splice(idx, 1)
    }
    const excerptsPool = [...SENT_EXCERPTS_POOL]
    const clientPeople = clientContacts.filter(
      (c) => c.clientId === row.clientId,
    )
    const excerpts: { fromName: string; date: string; snippet: string }[] = []
    while (excerpts.length < 3 && excerptsPool.length > 0) {
      const idx = Math.floor(rng() * excerptsPool.length)
      const contact =
        clientPeople[Math.floor(rng() * Math.max(1, clientPeople.length))] ??
        clientContacts[0]!
      const daysAgo = Math.floor(rng() * 13) + 1
      excerpts.push({
        fromName: contact.name,
        date: format(
          subDays(parseISO(row.periodEnd), daysAgo),
          'yyyy-MM-dd',
        ),
        snippet: excerptsPool[idx]!,
      })
      excerptsPool.splice(idx, 1)
    }
    return {
      clientId: row.clientId,
      periodEnd: row.periodEnd,
      reasons,
      excerpts,
    }
  },
)

export const pairwiseSentiment: PairwiseSentiment[] = (() => {
  const out: PairwiseSentiment[] = []
  for (const c of clients) {
    const contacts = clientContacts.filter((x) => x.clientId === c.id)
    const picks = staff.slice(0, 5)
    for (const contact of contacts) {
      for (const st of picks) {
        const rng = mulberry32(hashSeed(`pw-${contact.id}-${st.id}`))
        const staffBias =
          st.id === 'e1'
            ? 0.2
            : st.id === 'e2'
              ? -0.15
              : st.id === 'e5'
                ? 0.12
                : 0
        const contactBias =
          contact.priority === 'critical'
            ? -0.1
            : contact.priority === 'low'
              ? 0.1
              : 0
        const score = Math.max(
          -0.95,
          Math.min(0.95, staffBias + contactBias + (rng() - 0.5) * 0.7),
        )
        const msgCount = 4 + Math.floor(rng() * 22)
        const firstName = contact.name.split(' ')[0]
        const staffFirst = st.name.split(' ')[0]
        const note =
          score > 0.5
            ? `${firstName} responds quickly to ${staffFirst} and uses positive language.`
            : score < -0.4
              ? `${firstName} has reminded ${staffFirst} multiple times — escalation risk.`
              : `Mostly transactional, low-volume thread between ${firstName} and ${staffFirst}.`
        out.push({
          clientId: c.id,
          contactId: contact.id,
          staffId: st.id,
          score: Math.round(score * 100) / 100,
          msgCount,
          note,
        })
      }
    }
  }
  return out
})()

export const demoDateRange = { start: demoStart, end: demoEnd }
