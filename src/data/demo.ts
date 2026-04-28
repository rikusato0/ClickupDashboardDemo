import { eachDayOfInterval, format, subWeeks } from 'date-fns'

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
  { id: 'c1', name: 'Northbridge LLP', domain: 'northbridge-law.com' },
  { id: 'c2', name: 'Harborview Clinics', domain: 'harborviewcare.org' },
  { id: 'c3', name: 'Cedar & Co. Retail', domain: 'cedarretail.co' },
  { id: 'c4', name: 'Ironworks Foundry', domain: 'ironworks-ind.com' },
  { id: 'c5', name: 'Brightline SaaS', domain: 'brightlineapp.io' },
  { id: 'c6', name: 'Pelican Hospitality', domain: 'pelicanhosp.com' },
  { id: 'c7', name: 'Maple Street Credit Union', domain: 'maplestcu.org' },
  { id: 'c8', name: 'Vertex Robotics', domain: 'vertexrobotics.tech' },
  { id: 'c9', name: 'Olive & Finch Foods', domain: 'olivefinchfoods.com' },
  { id: 'c10', name: 'Summit Charter Schools', domain: 'summitcharter.edu' },
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

  for (const s of staff) {
    const rng = mulberry32(hashSeed(`staff-${s.id}`))
    for (const day of days) {
      if (rng() < 0.07) continue
      const n = 1 + Math.floor(rng() * 4)
      for (let i = 0; i < n; i++) {
        const c = clients[Math.floor(rng() * clients.length)]!
        const tt = TASK_TYPES[Math.floor(rng() * TASK_TYPES.length)]!
        const h = Math.round((0.25 + rng() * 2.75) * 4) / 4
        entries.push({
          id: `te-${nid++}`,
          date: format(day, 'yyyy-MM-dd'),
          staffId: s.id,
          clientId: c.id,
          taskType: tt,
          hours: h,
          description: descPool[Math.floor(rng() * descPool.length)]!,
          clickUpTaskId: `${100000 + Math.floor(rng() * 899999)}`,
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

export const demoDateRange = { start: demoStart, end: demoEnd }
