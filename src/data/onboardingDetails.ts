export interface OnboardingDetail {
  id: string
  executiveSummary: string
  milestones: { date: string; label: string; status: 'done' | 'upcoming' | 'at-risk' }[]
  blockers: string[]
  clientContacts: { name: string; role: string }[]
  nextSync: string
}

export const onboardingDetailsById: Record<string, OnboardingDetail> = {
  ob1: {
    id: 'ob1',
    executiveSummary:
      'Lumen Analytics is mid–system mapping. Payroll bridge is the gating dependency before first shadow close.',
    milestones: [
      { date: '2026-04-02', label: 'Kickoff', status: 'done' },
      { date: '2026-04-18', label: 'COA import verified', status: 'done' },
      { date: '2026-05-05', label: 'Payroll bridge live', status: 'at-risk' },
      { date: '2026-05-22', label: 'First shadow close', status: 'upcoming' },
    ],
    blockers: [
      'Awaiting HCM API keys from client IT.',
      'Historical payroll mapping needs one additional pay group.',
    ],
    clientContacts: [
      { name: 'Sarah Chen', role: 'Controller' },
      { name: 'Dev Patel', role: 'IT liaison' },
    ],
    nextSync: '2026-05-01 · 10:00 AM (Teams)',
  },
  ob2: {
    id: 'ob2',
    executiveSummary:
      'Redwood Dental needs patient billing mapping signed off before entity structure can be finalized in the GL.',
    milestones: [
      { date: '2026-03-18', label: 'Kickoff', status: 'done' },
      { date: '2026-04-10', label: 'Trial balance loaded', status: 'done' },
      { date: '2026-05-01', label: 'Billing mapping workshop', status: 'upcoming' },
      { date: '2026-06-10', label: 'Training block 1', status: 'upcoming' },
    ],
    blockers: ['Practice management export delayed from vendor.'],
    clientContacts: [
      { name: 'Dr. Amaya Ruiz', role: 'Managing partner' },
      { name: 'Luis Ortega', role: 'Office manager' },
    ],
    nextSync: '2026-04-30 · 2:00 PM (on-site)',
  },
  ob3: {
    id: 'ob3',
    executiveSummary:
      'Cascade Freight is in discovery: driver pay rules and fuel-card policies drive GL structure.',
    milestones: [
      { date: '2026-04-12', label: 'SOW closed', status: 'done' },
      { date: '2026-05-08', label: 'Pay rules documented', status: 'upcoming' },
      { date: '2026-06-20', label: 'Multi-entity map approved', status: 'upcoming' },
    ],
    blockers: ['Legal review of owner-operator contracts in progress.'],
    clientContacts: [
      { name: 'Helen Wu', role: 'CFO' },
    ],
    nextSync: '2026-05-06 · 9:30 AM (phone)',
  },
  ob4: {
    id: 'ob4',
    executiveSummary:
      'Willow Ridge HOA is in final shadow close; reserve study tie-out completed. Awaiting board sign-off package.',
    milestones: [
      { date: '2026-03-01', label: 'Assessments live', status: 'done' },
      { date: '2026-04-15', label: '1099 history clean', status: 'done' },
      { date: '2026-04-28', label: 'Reserve study', status: 'done' },
      { date: '2026-05-01', label: 'Go-live / sign-off', status: 'upcoming' },
    ],
    blockers: [],
    clientContacts: [
      { name: 'Robert Ingalls', role: 'Board treasurer' },
    ],
    nextSync: '2026-04-29 · 4:00 PM (board prep call)',
  },
  ob5: {
    id: 'ob5',
    executiveSummary:
      'NovaForm early intake: secure portal is live; prior-year binder and grant revenue model still outstanding.',
    milestones: [
      { date: '2026-04-20', label: 'Portal access', status: 'done' },
      { date: '2026-05-15', label: 'Prior-year binder received', status: 'upcoming' },
      { date: '2026-06-01', label: 'Grant model v1', status: 'upcoming' },
    ],
    blockers: ['Client gathering signed donor restriction letters.'],
    clientContacts: [
      { name: 'Jordan Ellis', role: 'Executive director' },
    ],
    nextSync: '2026-05-03 · 11:00 AM (Zoom)',
  },
  ob6: {
    id: 'ob6',
    executiveSummary:
      'Keystone Municipal completed onboarding. Postmortem captures lessons for next public-sector intake.',
    milestones: [
      { date: '2026-01-08', label: 'Start', status: 'done' },
      { date: '2026-04-15', label: 'Go-live', status: 'done' },
      { date: '2026-04-30', label: 'Postmortem', status: 'done' },
    ],
    blockers: [],
    clientContacts: [
      { name: 'Pat Kim', role: 'Finance director' },
    ],
    nextSync: 'Complete — archive in 30 days',
  },
}
