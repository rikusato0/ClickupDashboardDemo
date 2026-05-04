import {
  addDays,
  endOfISOWeek,
  parseISO,
  startOfISOWeek,
  subWeeks,
} from 'date-fns'
import {
  ClientModel,
  EmailMessageModel,
  StaffModel,
  ThreadInsightModel,
  TimeEntryModel,
  ZoomTranscriptModel,
} from './models.js'
import { COMMS_CATEGORIES, type CommsCategory } from './dashboardTypes.js'
import { runPredictedNeeds } from './openaiAnalyze.js'
import type {
  Client,
  ClientContact,
  DailyResponseTime,
  DashboardSnapshot,
  MonthlyPatternByClient,
  PairwiseSentiment,
  PatternSample,
  PatternTrend,
  PredictedNeed,
  ResponseSample,
  SentimentBiweekly,
  SentimentCell,
  SentimentSampleSet,
  Staff,
  TimeEntry,
  WeeklyClientInbound,
  WeeklyEmailVol,
} from './snapshotShapes.js'

function iso(d: Date) {
  return d.toISOString().slice(0, 10)
}

function weekStartMonday(d: Date) {
  return iso(startOfISOWeek(d))
}

function contactIdFor(email: string, clientId: string) {
  const slug = email.replace(/[^a-z0-9]/gi, '').slice(0, 24)
  return `ct-${clientId}-${slug || 'na'}`
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

export async function buildDashboardSnapshot(
  rangeFrom: string,
  rangeTo: string,
): Promise<DashboardSnapshot> {
  const fromD = parseISO(rangeFrom)
  const toD = parseISO(rangeTo)

  const clientDocs = await ClientModel.find({}).lean()
  const staffDocs = await StaffModel.find({}).lean()
  const timeDocs = await TimeEntryModel.find({
    date: { $gte: rangeFrom, $lte: rangeTo },
  }).lean()

  const clients: Client[] = clientDocs.map((c) => ({
    id: c.id,
    name: c.name,
    domain: c.domain ?? '',
    segment: c.segment ?? '',
    clickUpSpaceId: c.clickUpSpaceId,
    clickUpFolderId: c.clickUpFolderId ?? '',
    clickUpListId: c.clickUpListId ?? '',
    accountManagerStaffId: c.accountManagerStaffId ?? '',
    openTaskCount: c.openTaskCount ?? 0,
    engagementCode: c.engagementCode ?? '',
    emailDomains: c.emailDomains ?? [],
  }))

  const staff: Staff[] = staffDocs.map((s) => ({
    id: s.id,
    name: s.name,
    initials: s.initials,
    email: s.email,
  }))

  const staffById = new Map(staff.map((s) => [s.id, s]))

  const timeEntries: TimeEntry[] = timeDocs.map((t) => ({
    id: t.id,
    date: t.date,
    staffId: t.staffId,
    clientId: t.clientId,
    taskType: t.taskType as TimeEntry['taskType'],
    hours: t.hours,
    description: t.description,
    clickUpTaskId: t.clickUpTaskId,
    clickUpTaskName: t.clickUpTaskName,
  }))

  const msgs = await EmailMessageModel.find({
    internalDate: { $gte: fromD, $lte: addDays(toD, 1) },
  }).lean()

  const insights = await ThreadInsightModel.find({}).lean()

  const byThread = new Map<string, typeof msgs>()
  for (const m of msgs) {
    const arr = byThread.get(m.threadId) ?? []
    arr.push(m)
    byThread.set(m.threadId, arr)
  }

  type Rt = {
    minutes: number
    day: string
    contactEmail: string
    staffId: string
    clientId: string
    subj: string
  }
  const responseTimes: Rt[] = []

  for (const [, threadMsgs] of byThread) {
    const sorted = [...threadMsgs].sort(
      (a, b) => a.internalDate.getTime() - b.internalDate.getTime(),
    )
    let firstClient: (typeof msgs)[0] | null = null
    for (const m of sorted) {
      if (m.isInbound && m.clientId) {
        firstClient = m
        break
      }
    }
    if (!firstClient?.clientId) continue
    const t0 = firstClient.internalDate.getTime()
    let firstStaff: (typeof msgs)[0] | null = null
    for (const m of sorted) {
      if (!m.isInbound && m.staffId && m.internalDate.getTime() > t0) {
        firstStaff = m
        break
      }
    }
    if (!firstStaff?.staffId) continue
    responseTimes.push({
      minutes: Math.max(
        1,
        Math.round((firstStaff.internalDate.getTime() - t0) / 60000),
      ),
      day: iso(firstClient.internalDate),
      contactEmail: firstClient.fromEmail,
      staffId: firstStaff.staffId,
      clientId: firstClient.clientId,
      subj: firstClient.subject,
    })
  }

  const contactsMap = new Map<string, ClientContact>()
  for (const m of msgs) {
    if (!m.clientId || !m.fromEmail || !m.isInbound) continue
    const id = contactIdFor(m.fromEmail, m.clientId)
    if (!contactsMap.has(id)) {
      contactsMap.set(id, {
        id,
        clientId: m.clientId,
        name: m.fromName || m.fromEmail.split('@')[0] || 'Contact',
        email: m.fromEmail,
        role: 'Contact',
        priority: 'standard',
      })
    }
  }
  const clientContacts = [...contactsMap.values()]

  const respGrouped = new Map<string, number[]>()
  for (const r of responseTimes) {
    const cid = contactIdFor(r.contactEmail, r.clientId)
    const key = `${cid}###${r.staffId}`
    const arr = respGrouped.get(key) ?? []
    arr.push(r.minutes)
    respGrouped.set(key, arr)
  }

  const responseByContact: ResponseSample[] = []
  for (const [key, vals] of respGrouped) {
    const [contactId, staffId] = key.split('###') as [string, string]
    const one = responseTimes.find(
      (x) => contactIdFor(x.contactEmail, x.clientId) === contactId,
    )
    responseByContact.push({
      contactId,
      staffId,
      medianMinutes: median(vals),
      sampleSize: vals.length,
      lastThreadSubject: one?.subj ?? '',
    })
  }

  const byDayMed = new Map<string, number[]>()
  for (const r of responseTimes) {
    const arr = byDayMed.get(r.day) ?? []
    arr.push(r.minutes)
    byDayMed.set(r.day, arr)
  }
  const dailyResponseTimes: DailyResponseTime[] = [...byDayMed.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, vals]) => ({
      date,
      medianMinutes: Math.round(median(vals)),
      sampleSize: vals.length,
    }))

  const inboundMap = new Map<string, number>()
  for (const m of msgs) {
    if (!m.isInbound || !m.clientId) continue
    const wk = weekStartMonday(m.internalDate)
    const key = `${m.clientId}###${wk}`
    inboundMap.set(key, (inboundMap.get(key) ?? 0) + 1)
  }
  const weeklyClientInboundEmails: WeeklyClientInbound[] = []
  for (const [key, n] of inboundMap) {
    const [clientId, wStart] = key.split('###') as [string, string]
    weeklyClientInboundEmails.push({
      clientId,
      weekStart: wStart,
      received: n,
    })
  }

  const volMap = new Map<string, { sent: number; received: number }>()
  const staffEmailLower = new Map(
    staff.filter((s) => s.email).map((s) => [s.email!.toLowerCase(), s.id]),
  )
  for (const m of msgs) {
    const wk = weekStartMonday(m.internalDate)
    if (m.staffId) {
      const k = `${m.staffId}###${wk}`
      const cur = volMap.get(k) ?? { sent: 0, received: 0 }
      if (!m.isInbound) cur.sent += 1
      else cur.received += 1
      volMap.set(k, cur)
    }
    for (const to of m.toEmails ?? []) {
      const sid = staffEmailLower.get(to.toLowerCase())
      if (sid) {
        const k = `${sid}###${wk}`
        const cur = volMap.get(k) ?? { sent: 0, received: 0 }
        cur.received += 1
        volMap.set(k, cur)
      }
    }
  }

  const weeklyEmailVolume: WeeklyEmailVol[] = []
  for (const [key, v] of volMap) {
    const [staffId, wStart] = key.split('###') as [string, string]
    const hrs = timeEntries
      .filter(
        (t) =>
          t.staffId === staffId &&
          weekStartMonday(parseISO(t.date)) === wStart,
      )
      .reduce((a, t) => a + t.hours, 0)
    weeklyEmailVolume.push({
      staffId,
      weekStart: wStart,
      sent: v.sent,
      received: v.received,
      loggedHours: Math.round(hrs * 10) / 10,
    })
  }

  const mp2 = new Map<string, number>()
  for (const ins of insights) {
    if (!ins.clientId) continue
    const month = iso(ins.analyzedAt).slice(0, 7)
    const k = JSON.stringify([ins.clientId, month, ins.category])
    mp2.set(k, (mp2.get(k) ?? 0) + 1)
  }
  const monthlyPatternsFinal: MonthlyPatternByClient[] = []
  for (const [k, v] of mp2) {
    const [clientId, month, category] = JSON.parse(k) as [
      string,
      string,
      CommsCategory,
    ]
    monthlyPatternsFinal.push({ clientId, month, category, volume: v })
  }

  const weekBuckets = [...Array(12)].map((_, i) =>
    weekStartMonday(subWeeks(new Date(), 11 - i)),
  )
  const patternTrends: PatternTrend[] = COMMS_CATEGORIES.map((cat, idx) => {
    const weeklyVolumes = weekBuckets.map((ws) => {
      const start = parseISO(ws)
      const end = addDays(start, 7)
      return insights.filter(
        (i) =>
          i.category === cat &&
          i.analyzedAt >= start &&
          i.analyzedAt < end,
      ).length
    })
    return {
      id: `cat-${idx}`,
      label: cat,
      category: cat,
      weeklyVolumes,
    }
  })

  const patternSamples: PatternSample[] = []
  for (const ins of insights.slice(0, 40)) {
    const threadMsgs = msgs.filter((m) => m.threadId === ins.threadId)
    const msg = threadMsgs[0]
    const pid =
      patternTrends.find((p) => p.category === ins.category)?.id ?? 'cat-0'
    const staffMsg = threadMsgs.find((m) => m.staffId)
    patternSamples.push({
      patternId: pid,
      fromContact: msg?.fromName ?? 'Client',
      toStaff:
        staffById.get(staffMsg?.staffId ?? '')?.name ??
        staff[0]?.name ??
        'Staff',
      date: iso(ins.analyzedAt),
      snippet: ins.summary.slice(0, 280),
    })
  }

  const biEnds = [...Array(12)].map((_, i) =>
    iso(endOfISOWeek(subWeeks(new Date(), (11 - i) * 2))),
  )

  const sentimentBiweekly: SentimentBiweekly[] = []
  for (const c of clients) {
    for (const periodEnd of biEnds) {
      const pe = parseISO(periodEnd)
      const pb = subWeeks(pe, 2)
      const slice = insights.filter(
        (i) =>
          i.clientId === c.id && i.analyzedAt > pb && i.analyzedAt <= pe,
      )
      if (slice.length === 0) continue
      const score =
        Math.round(
          (slice.reduce((a, x) => a + x.sentiment, 0) / slice.length) *
            100,
        ) / 100
      sentimentBiweekly.push({
        clientId: c.id,
        periodEnd,
        score,
        msgCount: slice.length,
        topReason: slice[slice.length - 1]!.summary ?? '',
      })
    }
  }

  const sentimentSampleSets: SentimentSampleSet[] = sentimentBiweekly.map(
    (row) => {
      const pe = parseISO(row.periodEnd)
      const pb = subWeeks(pe, 2)
      const ex = insights
        .filter(
          (i) =>
            i.clientId === row.clientId &&
            i.analyzedAt > pb &&
            i.analyzedAt <= pe,
        )
        .slice(0, 3)
        .map((i) => {
          const m = msgs.find((x) => x.threadId === i.threadId)
          return {
            fromName: m?.fromName ?? 'Client',
            date: iso(i.analyzedAt),
            snippet: i.summary,
          }
        })
      return {
        clientId: row.clientId,
        periodEnd: row.periodEnd,
        reasons: [
          row.topReason,
          'Communication volume',
          'Thread sentiment average',
        ].filter(Boolean),
        excerpts:
          ex.length > 0
            ? ex
            : [
                {
                  fromName: '—',
                  date: row.periodEnd,
                  snippet:
                    'No excerpts yet — sync Gmail and run OpenAI analysis.',
                },
              ],
      }
    },
  )

  const sentimentCells: SentimentCell[] = []
  for (const c of clients) {
    for (const w of [2, 4, 8, 12] as const) {
      const start = subWeeks(new Date(), w)
      const slice = insights.filter(
        (i) => i.clientId === c.id && i.analyzedAt >= start,
      )
      const score =
        slice.length === 0
          ? 0
          : Math.round(
              (slice.reduce((a, x) => a + x.sentiment, 0) / slice.length) *
                100,
            ) / 100
      sentimentCells.push({
        clientId: c.id,
        windowWeeks: w,
        score,
        volume: slice.length,
        trend: 'flat',
      })
    }
  }

  const insightByThread = new Map(insights.map((i) => [i.threadId, i]))

  const pairwiseSentiment: PairwiseSentiment[] = []
  for (const row of responseByContact) {
    const c = contactsMap.get(row.contactId)
    if (!c) continue
    const sampleRt = responseTimes.find(
      (x) =>
        contactIdFor(x.contactEmail, x.clientId) === row.contactId &&
        x.staffId === row.staffId,
    )
    let ins = undefined as (typeof insights)[number] | undefined
    if (sampleRt) {
      const th = msgs.find(
        (m) =>
          m.fromEmail === sampleRt.contactEmail &&
          m.clientId === c.clientId,
      )?.threadId
      if (th) ins = insightByThread.get(th)
    }
    if (!ins) ins = insights.find((i) => i.clientId === c.clientId)

    pairwiseSentiment.push({
      clientId: c.clientId,
      contactId: row.contactId,
      staffId: row.staffId,
      score: ins?.sentiment ?? 0,
      msgCount: row.sampleSize,
      note: ins?.summary ?? 'Email thread linkage — refine after more sync.',
    })
  }

  const zoomBits = await ZoomTranscriptModel.find({}).limit(20).lean()
  const zoomNote = zoomBits
    .map((z) => `${z.topic}: ${z.transcriptText.slice(0, 400)}`)
    .join('\n')

  const summaries = clients.map((c) => {
    const notes = insights
      .filter((i) => i.clientId === c.id)
      .map((i) => i.summary)
      .join(' | ')
    return {
      id: c.id,
      name: c.name,
      notes: `${notes}\nMeetings:\n${zoomNote}`.slice(0, 4000),
    }
  })
  const rawNeeds = await runPredictedNeeds(summaries)
  const clientIdSet = new Set(clients.map((c) => c.id))
  const predictedClientNeeds: PredictedNeed[] = rawNeeds
    .filter((n) => clientIdSet.has(n.clientId))
    .map((n, i) => ({
      id: `pn-${i}`,
      clientId: n.clientId,
      dueDate: n.dueDate,
      title: n.title,
      detail: n.detail,
      confidence: n.confidence,
      sourcePatternId: null,
    }))

  return {
    dateRange: { start: rangeFrom, end: rangeTo },
    clients,
    staff,
    timeEntries,
    clientContacts,
    responseByContact,
    sentimentCells,
    weeklyEmailVolume,
    dailyResponseTimes,
    weeklyClientInboundEmails,
    monthlyPatternsByClient: monthlyPatternsFinal,
    patternTrends,
    patternSamples,
    predictedClientNeeds,
    sentimentBiweekly,
    sentimentSampleSets,
    pairwiseSentiment,
    onboardingClients: [],
    onboardingDetailsById: {},
  }
}
