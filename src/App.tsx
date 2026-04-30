import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  Angry,
  Bell,
  BookUser,
  Building2,
  CalendarClock,
  ChevronRight,
  Clock,
  Download,
  Frown,
  HeartPulse,
  Inbox,
  Meh,
  Network,
  Rocket,
  Smile,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  COMMS_CATEGORIES,
  COMMS_CATEGORY_COLORS,
  type CommsCategory,
  type OnboardingClient,
  type TaskType,
  TASK_TYPES,
  clientContacts,
  clients,
  dailyResponseTimes,
  getMockDashboardSnapshot,
  getTeamMedianResponseMinutes,
  monthlyPatternsByClient,
  onboardingDetailsById,
  pairwiseSentiment,
  patternSamples,
  patternTrends,
  predictedClientNeeds,
  responseByContact,
  sentimentBiweekly,
  sentimentCells,
  sentimentSampleSets,
  staff,
  timeEntries,
  type TimeEntry,
  weeklyClientInboundEmails,
  weeklyEmailVolume,
} from './data/mockDashboard'
import { BrandLogo } from './components/BrandLogo'
import { DateRangePicker } from './components/DateRangePicker'
import { FilterMultiSelect } from './components/FilterMultiSelect'
import { eachDayOfInterval, format, parseISO, subDays } from 'date-fns'
import { fmtExportCell, fmtFixed, fmtInt, fmtMinutes } from './utils/format'

type NavId =
  | 'timesheets'
  | 'comms'
  | 'sentiment'
  | 'profiles'
  | 'onboarding'

const NAV: { id: NavId; label: string; icon: typeof Clock }[] = [
  { id: 'timesheets', label: 'Timesheets', icon: Clock },
  { id: 'comms', label: 'Communications analysis', icon: Inbox },
  { id: 'sentiment', label: 'Client sentiment', icon: HeartPulse },
  { id: 'profiles', label: 'Client profiles', icon: BookUser },
  { id: 'onboarding', label: 'Client onboarding', icon: Rocket },
]

const TASK_COLORS: Record<TaskType, string> = {
  'One-time': '#06b6d4',
  Recurring: '#0891b2',
  OT: '#ff8500',
  'Month end': '#0e7490',
  Payroll: '#67e8f9',
}

const CHART_PRIMARY = '#06b6d4'
const CHART_GRID = '#e5e7eb'
const CHART_TICK = { fill: '#64748b', fontSize: 12 }
const CHART_TICK_SM = { fill: '#64748b', fontSize: 11 }
const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  color: '#1e293b',
}

/**
 * Industry guidance: 0–2h = fast, 2–4h = warning, 4h+ = critical for
 * client-response medians. Centralised so chart fills, KPI numbers, and
 * row badges stay in sync.
 */
type RespSeverity = 'fast' | 'warning' | 'critical'

const FAST_MAX_MIN = 120
const WARNING_MAX_MIN = 240

function responseSeverity(minutes: number): RespSeverity {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'fast'
  if (minutes < FAST_MAX_MIN) return 'fast'
  if (minutes < WARNING_MAX_MIN) return 'warning'
  return 'critical'
}

const SEVERITY_TEXT: Record<RespSeverity, string> = {
  fast: 'text-emerald-600',
  warning: 'text-amber-600',
  critical: 'text-wl-orange',
}

const SEVERITY_BADGE: Record<RespSeverity, string> = {
  fast: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  critical: 'bg-wl-orange/10 text-wl-orange border border-wl-orange/30',
}

const SEVERITY_LABEL: Record<RespSeverity, string> = {
  fast: 'Fast',
  warning: 'Warning',
  critical: 'Critical',
}

const SEVERITY_FILL: Record<RespSeverity, string> = {
  fast: '#10b981',
  warning: '#f59e0b',
  critical: '#ff8500',
}

/**
 * Sentiment quantization. The transcript: client wants "happy / meh / sad /
 * frustrated" faces instead of raw numeric scores so reports are scannable
 * at a glance.
 */
type SentLevel = 'happy' | 'meh' | 'sad' | 'frustrated'

function sentimentLevel(score: number): SentLevel {
  if (score >= 0.4) return 'happy'
  if (score >= 0) return 'meh'
  if (score >= -0.4) return 'sad'
  return 'frustrated'
}

const SENT_STYLE: Record<
  SentLevel,
  {
    Icon: LucideIcon
    label: string
    text: string
    bg: string
    border: string
    fill: string
  }
> = {
  happy: {
    Icon: Smile,
    label: 'Happy',
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    fill: '#10b981',
  },
  meh: {
    Icon: Meh,
    label: 'Meh',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    fill: '#f59e0b',
  },
  sad: {
    Icon: Frown,
    label: 'Sad',
    text: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    fill: '#fb923c',
  },
  frustrated: {
    Icon: Angry,
    label: 'Frustrated',
    text: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    fill: '#e11d48',
  },
}

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

/** RFC 4180-ish CSV escaping: quote fields that contain , " or newline,
 * and double up any embedded quotes. Em-dash placeholders become empty. */
function csvCell(value: string | number): string {
  if (value === '—' || value === '-' || value === '' || value == null) return ''
  const s = String(value)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * XAxis tick that renders names horizontally and word-wraps at ~14 chars so long
 * client names like "Maple Street Credit Union" don't overflow their column.
 * Caps at two lines; anything left over is folded onto the second line.
 */
function WrappedAxisTick(props: {
  x?: number
  y?: number
  payload?: { value: string }
  fontSize?: number
  maxCharsPerLine?: number
}) {
  const { x = 0, y = 0, payload, fontSize = 11, maxCharsPerLine = 14 } = props
  const text = payload?.value ?? ''
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxCharsPerLine && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  if (lines.length > 2) {
    lines[1] = lines.slice(1).join(' ')
    lines.length = 2
  }
  const lineHeight = fontSize + 2
  return (
    <g transform={`translate(${x},${y + 4})`}>
      {lines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={i * lineHeight + lineHeight}
          textAnchor="middle"
          fill="#64748b"
          fontSize={fontSize}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

function Card({
  children,
  className,
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-wl-surface bg-wl-card shadow-sm shadow-slate-900/5',
        className,
      )}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-wl-surface px-5 py-4">
          <div>
            {title && (
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-[13px] text-wl-ink-muted">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

function filterEntries(
  entries: TimeEntry[],
  opts: {
    from: string
    to: string
    staffIds: string[] | null
    clientIds: string[] | null
    taskTypes: TaskType[] | null
  },
) {
  return entries.filter((e) => {
    if (e.date < opts.from || e.date > opts.to) return false
    if (
      opts.staffIds !== null &&
      !opts.staffIds.includes(e.staffId)
    )
      return false
    if (
      opts.clientIds !== null &&
      !opts.clientIds.includes(e.clientId)
    )
      return false
    if (
      opts.taskTypes !== null &&
      !opts.taskTypes.includes(e.taskType)
    )
      return false
    return true
  })
}

function sentimentColor(score: number) {
  const t = (score + 1) / 2
  const hue = 12 + t * 118
  return `hsl(${hue} 72% ${42 + t * 8}%)`
}

export default function App() {
  const snapshot = useMemo(() => getMockDashboardSnapshot(), [])
  const BASELINE_FROM = format(snapshot.dateRange.start, 'yyyy-MM-dd')
  const BASELINE_TO = format(snapshot.dateRange.end, 'yyyy-MM-dd')

  const [nav, setNav] = useState<NavId>('timesheets')
  const [dateFrom, setDateFrom] = useState(BASELINE_FROM)
  const [dateTo, setDateTo] = useState(BASELINE_TO)
  const [filterStaff, setFilterStaff] = useState<string[] | null>(null)
  const [filterClients, setFilterClients] = useState<string[] | null>(null)
  const [filterTaskTypes, setFilterTaskTypes] = useState<TaskType[] | null>(
    null,
  )
  const [openFilterId, setOpenFilterId] = useState<string | null>(null)
  const [tsSub, setTsSub] = useState<
    'overview' | 'by_client' | 'by_type' | 'by_staff' | 'export'
  >('overview')
  const [exportStaffIds, setExportStaffIds] = useState<string[] | null>(null)
  const [commsSub, setCommsSub] = useState<'patterns' | 'response' | 'email'>(
    'patterns',
  )
  const [patternsClientId, setPatternsClientId] = useState<string>('c1')
  const [patternDrillId, setPatternDrillId] = useState<string | null>(null)
  const [respStaffFilter, setRespStaffFilter] = useState<string[] | null>(null)
  const [respAlertDirection, setRespAlertDirection] = useState<'above' | 'below'>(
    'above',
  )
  const [respAlertThreshold, setRespAlertThreshold] = useState<number>(90)
  const [sentimentClientId, setSentimentClientId] = useState<string>('c4')
  const [sentimentDrill, setSentimentDrill] = useState<{
    clientId: string
    periodEnd: string
  } | null>(null)
  const [profileClientId, setProfileClientId] = useState<string>('c1')
  const [onboardingState, setOnboardingState] = useState<OnboardingClient[]>(
    () =>
      getMockDashboardSnapshot().onboardingClients.map((c) => ({
        ...c,
        steps: c.steps.map((s) => ({ ...s })),
      })),
  )
  const [onboardingDetailId, setOnboardingDetailId] = useState<string | null>(
    null,
  )

  const filterOpts = useMemo(
    () => ({
      from: dateFrom,
      to: dateTo,
      staffIds: filterStaff,
      clientIds: filterClients,
      taskTypes: filterTaskTypes,
    }),
    [dateFrom, dateTo, filterStaff, filterClients, filterTaskTypes],
  )

  const filtered = useMemo(
    () => filterEntries(timeEntries, filterOpts),
    [filterOpts],
  )

  const byClient = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of filtered) {
      m.set(e.clientId, (m.get(e.clientId) ?? 0) + e.hours)
    }
    return clients
      .map((c) => ({ name: c.name, hours: Math.round((m.get(c.id) ?? 0) * 10) / 10 }))
      .filter((r) => r.hours > 0)
      .sort((a, b) => b.hours - a.hours)
  }, [filtered])

  const byClientType = useMemo(() => {
    const rows: Record<string, string | number>[] = []
    for (const c of clients) {
      const row: Record<string, string | number> = { client: c.name }
      let sum = 0
      for (const tt of TASK_TYPES) {
        const hrs = filtered
          .filter((e) => e.clientId === c.id && e.taskType === tt)
          .reduce((a, e) => a + e.hours, 0)
        row[tt] = Math.round(hrs * 10) / 10
        sum += hrs
      }
      row.total = Math.round(sum * 10) / 10
      if (sum > 0) rows.push(row)
    }
    return rows.sort((a, b) => (b.total as number) - (a.total as number))
  }, [filtered])

  const byStaff = useMemo(() => {
    return staff
      .map((s) => {
        const mine = filtered.filter((e) => e.staffId === s.id)
        const hours = Math.round(mine.reduce((a, e) => a + e.hours, 0) * 10) / 10
        const entries = mine.length
        return { ...s, hours, entries }
      })
      .filter((r) => r.hours > 0)
      .sort((a, b) => b.hours - a.hours)
  }, [filtered])

  const exportData = useMemo(() => {
    const days = eachDayOfInterval({
      start: parseISO(dateFrom),
      end: parseISO(dateTo),
    }).filter((d) => d.getDay() !== 0 && d.getDay() !== 6)
    const labels = days.map((d) => format(d, 'EEE M/d'))
    const keys = days.map((d) => format(d, 'yyyy-MM-dd'))
    const targetIds =
      exportStaffIds === null ? staff.map((s) => s.id) : exportStaffIds
    const rows = targetIds
      .map((sid) => {
        const s = staff.find((x) => x.id === sid)
        if (!s) return null
        const cells: Record<string, string | number> = { id: s.id, name: s.name }
        let total = 0
        keys.forEach((k, i) => {
          const hrs =
            Math.round(
              filtered
                .filter((e) => e.staffId === s.id && e.date === k)
                .reduce((a, e) => a + e.hours, 0) * 100,
            ) / 100
          cells[labels[i]!] = hrs || '—'
          total += hrs
        })
        cells.total = Math.round(total * 100) / 100
        return cells
      })
      .filter(
        (r): r is Record<string, string | number> => r !== null,
      )
    const totalsRow: Record<string, string | number> = { name: 'Daily total' }
    let grand = 0
    labels.forEach((l) => {
      const sum = rows.reduce((acc, r) => {
        const v = r[l]
        return acc + (typeof v === 'number' ? v : 0)
      }, 0)
      totalsRow[l] = sum > 0 ? Math.round(sum * 100) / 100 : '—'
      grand += sum
    })
    totalsRow.total = Math.round(grand * 100) / 100
    return { labels, keys, rows, totalsRow }
  }, [filtered, dateFrom, dateTo, exportStaffIds])

  const teamMedian = getTeamMedianResponseMinutes()

  const respByStaff = useMemo(() => {
    const agg = new Map<string, number[]>()
    for (const r of responseByContact) {
      if (
        respStaffFilter !== null &&
        !respStaffFilter.includes(r.staffId)
      )
        continue
      if (!agg.has(r.staffId)) agg.set(r.staffId, [])
      agg.get(r.staffId)!.push(r.medianMinutes)
    }
    return staff
      .map((s) => {
        const vals = agg.get(s.id) ?? []
        const med =
          vals.length === 0
            ? 0
            : [...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)]!
        const nm = vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
        return {
          name: s.name,
          median: Math.round(med),
          mean: Math.round(nm),
          samples: vals.length,
        }
      })
      .filter((r) => r.samples > 0)
      .sort((a, b) => a.median - b.median)
  }, [respStaffFilter])

  const respByContactPriority = useMemo(() => {
    return clientContacts.map((c) => {
      const related = responseByContact.filter((r) => r.contactId === c.id)
      const medians = related.map((r) => r.medianMinutes).sort((a, b) => a - b)
      const med =
        medians.length === 0
          ? 0
          : medians[Math.floor(medians.length / 2)]!
      const client = clients.find((x) => x.id === c.clientId)!
      return {
        ...c,
        clientName: client.name,
        median: med,
        priority: c.priority,
      }
    })
  }, [])

  const respByClient = useMemo(() => {
    const groups = new Map<string, number[]>()
    for (const row of respByContactPriority) {
      if (row.median <= 0) continue
      const list = groups.get(row.clientId) ?? []
      list.push(row.median)
      groups.set(row.clientId, list)
    }
    return clients
      .map((c) => {
        const samples = (groups.get(c.id) ?? []).sort((a, b) => a - b)
        const median =
          samples.length === 0
            ? 0
            : samples[Math.floor(samples.length / 2)]!
        return {
          clientId: c.id,
          clientName: c.name,
          median,
          samples: samples.length,
        }
      })
      .filter((r) => r.samples > 0)
      .sort((a, b) => b.median - a.median)
  }, [respByContactPriority])

  const respAlerts = useMemo(() => {
    return respByClient.filter((r) =>
      respAlertDirection === 'above'
        ? r.median > respAlertThreshold
        : r.median < respAlertThreshold,
    )
  }, [respByClient, respAlertDirection, respAlertThreshold])

  /**
   * 6-month daily series with a 14-day rolling average so the chart can
   * render both the raw daily noise and a smoothed trend line.
   */
  const respTrend = useMemo(() => {
    const window = 14
    const series = dailyResponseTimes.map((d, i) => {
      const slice = dailyResponseTimes.slice(Math.max(0, i - window + 1), i + 1)
      const avg =
        slice.reduce((a, x) => a + x.medianMinutes, 0) / Math.max(1, slice.length)
      return {
        date: d.date,
        medianMinutes: d.medianMinutes,
        rolling14: Math.round(avg),
        sampleSize: d.sampleSize,
      }
    })
    if (series.length === 0) {
      return { series, first14Avg: 0, last14Avg: 0, change: 0 }
    }
    const first14 = series.slice(0, 14)
    const last14 = series.slice(-14)
    const first14Avg = Math.round(
      first14.reduce((a, x) => a + x.medianMinutes, 0) / first14.length,
    )
    const last14Avg = Math.round(
      last14.reduce((a, x) => a + x.medianMinutes, 0) / last14.length,
    )
    const change =
      first14Avg > 0 ? (last14Avg - first14Avg) / first14Avg : 0
    return { series, first14Avg, last14Avg, change }
  }, [])

  /**
   * Inbound emails from clients: weekly totals (drives the line chart) and
   * a per-client leaderboard summed over the last 4 weeks.
   */
  const inboundWeekly = useMemo(() => {
    const weeks = [
      ...new Set(weeklyClientInboundEmails.map((w) => w.weekStart)),
    ].sort()
    return weeks.map((week) => {
      const total = weeklyClientInboundEmails
        .filter((x) => x.weekStart === week)
        .reduce((a, x) => a + x.received, 0)
      return { week, total }
    })
  }, [])

  const inboundTopClients = useMemo(() => {
    const recent = inboundWeekly.slice(-4).map((w) => w.week)
    const totals = new Map<string, number>()
    for (const row of weeklyClientInboundEmails) {
      if (!recent.includes(row.weekStart)) continue
      totals.set(row.clientId, (totals.get(row.clientId) ?? 0) + row.received)
    }
    return clients
      .map((c) => ({
        clientId: c.id,
        clientName: c.name,
        received: totals.get(c.id) ?? 0,
      }))
      .filter((r) => r.received > 0)
      .sort((a, b) => b.received - a.received)
  }, [inboundWeekly])

  /** Communications-pattern memos. */
  const patternMixTotals = useMemo(() => {
    const totals = new Map<CommsCategory, number>()
    for (const p of patternTrends) {
      const sum = p.weeklyVolumes.reduce((a, x) => a + x, 0)
      totals.set(p.category, (totals.get(p.category) ?? 0) + sum)
    }
    return COMMS_CATEGORIES.map((cat) => ({
      category: cat,
      total: totals.get(cat) ?? 0,
    }))
  }, [])

  const monthlyPatternsForClient = useMemo(() => {
    const months = [
      ...new Set(monthlyPatternsByClient.map((m) => m.month)),
    ].sort()
    return months.map((month) => {
      const row: Record<string, string | number> = { month }
      for (const cat of COMMS_CATEGORIES) {
        const cell = monthlyPatternsByClient.find(
          (m) =>
            m.clientId === patternsClientId &&
            m.month === month &&
            m.category === cat,
        )
        row[cat] = cell?.volume ?? 0
      }
      return row
    })
  }, [patternsClientId])

  const upcomingPredictedNeeds = useMemo(() => {
    return [...predictedClientNeeds].sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate),
    )
  }, [])

  const patternDrill = useMemo(() => {
    if (!patternDrillId) return null
    const trend = patternTrends.find((p) => p.id === patternDrillId)
    if (!trend) return null
    const samples = patternSamples.filter((s) => s.patternId === patternDrillId)
    return { trend, samples }
  }, [patternDrillId])

  /** Sentiment memos. */
  const sentimentTrend = useMemo(() => {
    return sentimentBiweekly
      .filter((r) => r.clientId === sentimentClientId)
      .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))
  }, [sentimentClientId])

  const sentimentDrillData = useMemo(() => {
    if (!sentimentDrill) return null
    const cell = sentimentBiweekly.find(
      (s) =>
        s.clientId === sentimentDrill.clientId &&
        s.periodEnd === sentimentDrill.periodEnd,
    )
    if (!cell) return null
    const samples = sentimentSampleSets.find(
      (s) =>
        s.clientId === sentimentDrill.clientId &&
        s.periodEnd === sentimentDrill.periodEnd,
    )
    const pairs = pairwiseSentiment.filter(
      (p) => p.clientId === sentimentDrill.clientId,
    )
    return { cell, samples, pairs }
  }, [sentimentDrill])

  const emailChartData = useMemo(() => {
    const weeks = [...new Set(weeklyEmailVolume.map((w) => w.weekStart))].sort()
    return weeks.map((ws) => {
      const row: Record<string, string | number> = { week: ws }
      let sentSum = 0
      let hrsSum = 0
      for (const s of staff) {
        const cell = weeklyEmailVolume.find(
          (x) => x.weekStart === ws && x.staffId === s.id,
        )
        row[s.initials] = cell?.sent ?? 0
        sentSum += cell?.sent ?? 0
        hrsSum += cell?.loggedHours ?? 0
      }
      row['_team_sent'] = sentSum
      row['_team_hours'] = Math.round(hrsSum * 10) / 10
      return row
    })
  }, [])

  const last4WeeksEmail = emailChartData.slice(-4)

  const toggleOnboardingStep = (clientId: string, stepIndex: number) => {
    setOnboardingState((prev) =>
      prev.map((ob) => {
        if (ob.id !== clientId) return ob
        const steps = ob.steps.map((s, i) =>
          i === stepIndex ? { ...s, done: !s.done } : s,
        )
        const doneCount = steps.filter((s) => s.done).length
        const percentComplete = steps.length
          ? Math.round((doneCount / steps.length) * 100)
          : ob.percentComplete
        return { ...ob, steps, percentComplete }
      }),
    )
  }

  const onboardingDetail =
    onboardingDetailId != null
      ? onboardingDetailsById[onboardingDetailId]
      : undefined

  useEffect(() => {
    if (!onboardingDetailId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOnboardingDetailId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onboardingDetailId])

  useEffect(() => {
    if (!patternDrillId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPatternDrillId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [patternDrillId])

  useEffect(() => {
    if (!sentimentDrill) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSentimentDrill(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sentimentDrill])

  return (
    <div className="flex min-h-svh flex-col bg-wl-page text-wl-ink">
      <header className="sticky top-0 z-40 border-b border-wl-surface bg-wl-card">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-4 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex shrink-0 items-center gap-3">
            <BrandLogo className="h-10 w-10 shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="font-display text-[13px] font-bold tracking-[0.12em] text-wl-teal">
                WHITE LOTUS
              </p>
              <p className="-mt-0.5 text-[11px] font-semibold tracking-[0.18em] text-wl-ink-muted">
                BOOKKEEPING
              </p>
            </div>
          </div>
          <span className="hidden h-8 w-px bg-wl-surface sm:block" aria-hidden />
          <div className="min-w-0 flex-1 basis-[min(100%,18rem)] sm:basis-auto">
            <h1 className="text-base font-semibold tracking-tight text-wl-ink sm:text-[17px]">
              Metrics — White Lotus Bookkeeping
            </h1>
            <p className="mt-0.5 text-xs leading-snug text-wl-ink-muted">
              Time, communications, and onboarding metrics in one place.
            </p>
          </div>
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => {
              setDateFrom(f)
              setDateTo(t)
            }}
            baselineFrom={BASELINE_FROM}
            baselineTo={BASELINE_TO}
            className="ml-auto w-full min-w-0 shrink-0 sm:w-auto"
          />
        </div>
        <div className="border-t border-wl-surface bg-wl-card px-4 sm:px-6 lg:px-10">
          <nav className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Main">
            {NAV.map((item) => {
              const Icon = item.icon
              const active = nav === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setNav(item.id)
                    setOpenFilterId(null)
                  }}
                  className={cn(
                    'flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
                    active
                      ? 'border-wl-teal text-wl-teal'
                      : 'border-transparent text-wl-ink-muted hover:text-wl-ink',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10">
        {nav === 'timesheets' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 rounded-2xl border border-wl-surface bg-wl-card p-3 shadow-sm shadow-slate-900/5">
              <FilterMultiSelect
                menuId="staff"
                isOpen={openFilterId === 'staff'}
                onOpenChange={(open) =>
                  setOpenFilterId(open ? 'staff' : null)
                }
                icon={Users}
                label="Staff"
                searchPlaceholder="Search staff…"
                options={staff.map((s) => ({ id: s.id, label: s.name }))}
                selected={filterStaff}
                onChange={setFilterStaff}
              />
              <FilterMultiSelect
                menuId="clients"
                isOpen={openFilterId === 'clients'}
                onOpenChange={(open) =>
                  setOpenFilterId(open ? 'clients' : null)
                }
                icon={Building2}
                label="Clients"
                searchPlaceholder="Search clients…"
                options={clients.map((c) => ({ id: c.id, label: c.name }))}
                selected={filterClients}
                onChange={setFilterClients}
              />
              <FilterMultiSelect
                menuId="taskType"
                isOpen={openFilterId === 'taskType'}
                onOpenChange={(open) =>
                  setOpenFilterId(open ? 'taskType' : null)
                }
                icon={Clock}
                label="Task type"
                searchPlaceholder="Search task types…"
                options={TASK_TYPES.map((t) => ({ id: t, label: t }))}
                selected={filterTaskTypes}
                onChange={setFilterTaskTypes}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['overview', 'Summary'],
                  ['by_client', 'By client'],
                  ['by_type', 'Task types × client'],
                  ['by_staff', 'By staff'],
                  ['export', 'Daily export'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTsSub(id)}
                  className={cn(
                    'rounded-md px-3.5 py-1.5 text-sm font-medium leading-[1.23rem] transition-colors',
                    tsSub === id
                      ? 'bg-wl-teal-soft text-wl-teal-muted'
                      : 'text-wl-ink-muted hover:bg-wl-surface/50 hover:text-wl-ink',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tsSub === 'overview' && (
              <div className="grid gap-6 lg:grid-cols-3">
                <Card title="Total hours (filtered)">
                  <p className="text-3xl font-bold text-wl-ink">
                    {fmtFixed(
                      Math.round(
                        filtered.reduce((a, e) => a + e.hours, 0) * 10,
                      ) / 10,
                      1,
                    )}
                  </p>
                  <p className="mt-1 text-xs text-wl-ink-muted">
                    {fmtInt(filtered.length)} time entries in range
                  </p>
                </Card>
                <Card title="Active clients">
                  <p className="text-3xl font-bold text-wl-ink">
                    {fmtInt(byClient.length)}
                  </p>
                  <p className="mt-1 text-xs text-wl-ink-muted">
                    With logged time in filters
                  </p>
                </Card>
                <Card title="Staff contributing">
                  <p className="text-3xl font-bold text-wl-ink">
                    {fmtInt(byStaff.length)}
                  </p>
                </Card>
                <Card title="Hours by client" className="lg:col-span-3">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={byClient}
                        margin={{ left: 8, right: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                        <XAxis
                          dataKey="name"
                          tick={<WrappedAxisTick fontSize={11} />}
                          interval={0}
                          height={56}
                          tickMargin={6}
                        />
                        <YAxis
                          tick={CHART_TICK}
                          tickFormatter={(v) => fmtFixed(Number(v), 1)}
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(value) =>
                            fmtFixed(Number(value), 1)
                          }
                        />
                        <Bar dataKey="hours" fill={CHART_PRIMARY} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            )}

            {tsSub === 'by_client' && (
              <Card title="Hours by client (ranked)">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-wl-surface text-xs font-semibold uppercase tracking-wide text-wl-ink-muted">
                        <th className="pb-3 pr-4">Client</th>
                        <th className="pb-3 pr-4">Hours</th>
                        <th className="pb-3">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byClient.map((r) => {
                        const total = byClient.reduce((a, x) => a + x.hours, 0)
                        const pct = total ? Math.round((r.hours / total) * 1000) / 10 : 0
                        return (
                          <tr
                            key={r.name}
                            className="border-b border-wl-surface text-wl-ink"
                          >
                            <td className="py-2 pr-4 font-medium text-wl-ink">
                              {r.name}
                            </td>
                            <td className="py-2 pr-4 tabular-nums">
                              {fmtFixed(r.hours, 1)}
                            </td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-wl-surface">
                                  <div
                                    className="h-full rounded-full bg-wl-teal"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-10 text-right text-xs text-wl-ink-muted">
                                  {fmtFixed(pct, 1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {tsSub === 'by_type' && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Stacked hours — task type × client">
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={byClientType.slice(0, 8)}
                        margin={{ left: 8, right: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                        <XAxis
                          dataKey="client"
                          tick={<WrappedAxisTick fontSize={11} maxCharsPerLine={12} />}
                          interval={0}
                          height={56}
                          tickMargin={6}
                        />
                        <YAxis
                          tick={CHART_TICK}
                          tickFormatter={(v) => fmtFixed(Number(v), 1)}
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(value) =>
                            fmtFixed(Number(value), 1)
                          }
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          height={32}
                          wrapperStyle={{ fontSize: 11 }}
                        />
                        {TASK_TYPES.map((t) => (
                          <Bar
                            key={t}
                            dataKey={t}
                            stackId="a"
                            fill={TASK_COLORS[t]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card title="Table — full detail">
                  <div className="max-h-80 overflow-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-wl-page">
                        <tr className="text-wl-ink-muted">
                          <th className="py-2">Client</th>
                          {TASK_TYPES.map((t) => (
                            <th key={t} className="py-2">
                              {t}
                            </th>
                          ))}
                          <th className="py-2">Σ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byClientType.map((row) => (
                          <tr
                            key={String(row.client)}
                            className="border-t border-wl-surface text-wl-ink"
                          >
                            <td className="py-2 font-medium text-wl-ink">
                              {row.client}
                            </td>
                            {TASK_TYPES.map((t) => (
                              <td key={t} className="py-2 tabular-nums">
                                {fmtFixed(row[t] as number, 1)}
                              </td>
                            ))}
                            <td className="py-2 tabular-nums font-semibold text-wl-ink">
                              {fmtFixed(row.total as number, 1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {tsSub === 'by_staff' && (
              <Card title="Staff summary">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-wl-surface text-xs font-semibold uppercase tracking-wide text-wl-ink-muted">
                        <th className="pb-3 pr-4">Staff</th>
                        <th className="pb-3 pr-4">Hours</th>
                        <th className="pb-3 pr-4">Entries</th>
                        <th className="pb-3">Avg / entry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byStaff.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-wl-surface text-wl-ink"
                        >
                          <td className="py-2 pr-4">
                            <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-wl-teal-soft text-xs font-bold text-wl-teal-muted">
                              {r.initials}
                            </span>
                            {r.name}
                          </td>
                          <td className="py-2 pr-4 tabular-nums font-semibold text-wl-ink">
                            {fmtFixed(r.hours, 1)}
                          </td>
                          <td className="py-2 pr-4 tabular-nums text-wl-ink-muted">
                            {fmtInt(r.entries)}
                          </td>
                          <td className="py-2 tabular-nums text-wl-ink-muted">
                            {r.entries
                              ? fmtFixed(
                                  Math.round((r.hours / r.entries) * 100) /
                                    100,
                                  2,
                                )
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {tsSub === 'export' && (
              <Card
                title="Daily export"
                subtitle="Per-staff weekday hours and period total. Pick one or more staff, then export."
                action={
                  <button
                    type="button"
                    disabled={exportData.rows.length === 0}
                    onClick={() => {
                      const header = ['Staff', ...exportData.labels, 'Total']
                      const body = exportData.rows.map((r) => [
                        String(r.name),
                        ...exportData.labels.map((l) => r[l] ?? ''),
                        r.total ?? 0,
                      ])
                      const totals = [
                        'Daily total',
                        ...exportData.labels.map(
                          (l) => exportData.totalsRow[l] ?? '',
                        ),
                        exportData.totalsRow.total ?? 0,
                      ]
                      downloadCsv(
                        `daily-export_${dateFrom}_to_${dateTo}.csv`,
                        [header, ...body, totals],
                      )
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-wl-teal px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-wl-teal-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                }
              >
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-wl-ink-muted">
                    Staff
                  </span>
                  <FilterMultiSelect
                    menuId="export-staff"
                    isOpen={openFilterId === 'export-staff'}
                    onOpenChange={(open) =>
                      setOpenFilterId(open ? 'export-staff' : null)
                    }
                    icon={Users}
                    label="Staff"
                    searchPlaceholder="Search staff…"
                    options={staff.map((s) => ({ id: s.id, label: s.name }))}
                    selected={exportStaffIds}
                    onChange={setExportStaffIds}
                  />
                  <span className="text-[11px] text-wl-ink-muted">
                    {exportData.rows.length === 0
                      ? 'No staff selected'
                      : `${fmtInt(exportData.rows.length)} of ${fmtInt(staff.length)} shown`}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="border border-wl-surface bg-wl-page px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-wl-ink-muted">
                          Staff / day
                        </th>
                        {exportData.labels.map((l) => (
                          <th
                            key={l}
                            className="border border-wl-surface bg-wl-page px-2 py-2 text-center text-xs font-semibold text-wl-ink-muted"
                          >
                            {l}
                          </th>
                        ))}
                        <th className="border border-wl-teal/40 bg-wl-teal-soft px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-wl-teal-muted">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {exportData.rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={exportData.labels.length + 2}
                            className="border border-wl-surface px-3 py-6 text-center text-xs text-wl-ink-muted"
                          >
                            Select at least one staff member to see daily hours.
                          </td>
                        </tr>
                      ) : (
                        exportData.rows.map((r) => (
                          <tr key={r.id as string}>
                            <td className="border border-wl-surface bg-wl-page px-2 py-2 font-medium text-wl-ink">
                              {r.name}
                            </td>
                            {exportData.labels.map((l) => (
                              <td
                                key={l}
                                className="border border-wl-surface px-2 py-2 text-center tabular-nums text-wl-ink"
                              >
                                {fmtExportCell(r[l] as string | number)}
                              </td>
                            ))}
                            <td className="border border-wl-teal/40 bg-wl-teal-soft px-3 py-2 text-center text-sm font-bold tabular-nums text-wl-teal-muted">
                              {fmtFixed(r.total as number, 2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {exportData.rows.length > 1 && (
                      <tfoot>
                        <tr>
                          <td className="border border-wl-surface bg-wl-page px-2 py-2 text-xs font-semibold uppercase tracking-wide text-wl-ink-muted">
                            Daily total
                          </td>
                          {exportData.labels.map((l) => (
                            <td
                              key={l}
                              className="border border-wl-surface bg-wl-page px-2 py-2 text-center text-xs font-semibold tabular-nums text-wl-ink"
                            >
                              {fmtExportCell(
                                exportData.totalsRow[l] as string | number,
                              )}
                            </td>
                          ))}
                          <td className="border border-wl-teal/40 bg-wl-teal-soft px-3 py-2 text-center text-sm font-bold tabular-nums text-wl-teal-muted">
                            {fmtFixed(exportData.totalsRow.total as number, 2)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {nav === 'comms' && commsSub === 'patterns' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['patterns', 'Communications patterns'],
                  ['response', 'Response time'],
                  ['email', 'Email volume'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCommsSub(id)}
                  className={cn(
                    'rounded-md px-3.5 py-1.5 text-sm font-medium leading-[1.23rem] transition-colors',
                    commsSub === id
                      ? 'bg-wl-teal-soft text-wl-teal-muted'
                      : 'text-wl-ink-muted hover:bg-wl-surface/50 hover:text-wl-ink',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card
                title="Pattern mix — last 12 weeks"
                subtitle="Where the firm's inbound volume actually goes."
              >
                <div className="space-y-2">
                  {(() => {
                    const total = patternMixTotals.reduce(
                      (a, x) => a + x.total,
                      0,
                    )
                    const max = Math.max(
                      ...patternMixTotals.map((x) => x.total),
                      1,
                    )
                    return patternMixTotals
                      .slice()
                      .sort((a, b) => b.total - a.total)
                      .map((row) => {
                        const pct = total ? (row.total / total) * 100 : 0
                        const widthPct = (row.total / max) * 100
                        return (
                          <div
                            key={row.category}
                            className="rounded-lg border border-wl-surface bg-wl-page px-3 py-2"
                          >
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex min-w-0 items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                  style={{
                                    background:
                                      COMMS_CATEGORY_COLORS[row.category],
                                  }}
                                  aria-hidden
                                />
                                <span className="truncate font-medium text-wl-ink">
                                  {row.category}
                                </span>
                              </span>
                              <span className="shrink-0 tabular-nums text-wl-ink-muted">
                                <span className="font-semibold text-wl-ink">
                                  {fmtInt(row.total)}
                                </span>{' '}
                                · {fmtFixed(pct, 1)}%
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-wl-surface">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${widthPct}%`,
                                  background:
                                    COMMS_CATEGORY_COLORS[row.category],
                                }}
                              />
                            </div>
                          </div>
                        )
                      })
                  })()}
                </div>
                <p className="mt-3 text-[11px] text-wl-ink-muted">
                  When "Ad hoc requests" grows fast, that's a candidate to
                  promote to a recurring engagement.
                </p>
              </Card>

              <Card
                title="Recurring patterns — frequency over time"
                subtitle="Click any row to see why it was tagged this way."
              >
                <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {patternTrends
                    .slice()
                    .sort(
                      (a, b) =>
                        b.weeklyVolumes.reduce((x, y) => x + y, 0) -
                        a.weeklyVolumes.reduce((x, y) => x + y, 0),
                    )
                    .map((p) => {
                      const total = p.weeklyVolumes.reduce(
                        (x, y) => x + y,
                        0,
                      )
                      const last = p.weeklyVolumes.slice(-4).reduce(
                        (x, y) => x + y,
                        0,
                      )
                      const prev = p.weeklyVolumes
                        .slice(-8, -4)
                        .reduce((x, y) => x + y, 0)
                      const delta = prev > 0 ? (last - prev) / prev : 0
                      const max = Math.max(...p.weeklyVolumes, 1)
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => setPatternDrillId(p.id)}
                            className="flex w-full items-center gap-3 rounded-xl border border-wl-surface bg-wl-page px-3 py-2 text-left transition hover:border-wl-teal/40 hover:bg-wl-teal-soft/40"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-sm"
                                  style={{
                                    background:
                                      COMMS_CATEGORY_COLORS[p.category],
                                  }}
                                  aria-hidden
                                />
                                <span className="truncate text-sm font-medium text-wl-ink">
                                  {p.label}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-1">
                                {p.weeklyVolumes.map((v, i) => (
                                  <span
                                    key={i}
                                    className="inline-block w-1 rounded-sm"
                                    style={{
                                      height: `${Math.max(2, (v / max) * 22)}px`,
                                      background:
                                        COMMS_CATEGORY_COLORS[p.category],
                                      opacity: 0.55,
                                    }}
                                    aria-hidden
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-semibold tabular-nums text-wl-ink">
                                {fmtInt(total)}
                              </div>
                              <div
                                className={cn(
                                  'inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums',
                                  delta > 0.05
                                    ? 'text-wl-orange'
                                    : delta < -0.05
                                      ? 'text-emerald-600'
                                      : 'text-wl-ink-muted',
                                )}
                              >
                                {delta > 0.05 && (
                                  <TrendingUp className="h-3 w-3" />
                                )}
                                {delta < -0.05 && (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {Math.abs(delta * 100) >= 1
                                  ? `${fmtFixed(Math.abs(delta) * 100, 0)}%`
                                  : 'flat'}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-wl-ink-muted" />
                          </button>
                        </li>
                      )
                    })}
                </ul>
              </Card>
            </div>

            <Card
              title="Per-client monthly breakdown"
              subtitle="How a single client's inbound mix has moved across the last 6 months."
              action={
                <select
                  value={patternsClientId}
                  onChange={(e) => setPatternsClientId(e.target.value)}
                  className="rounded-lg border border-wl-surface bg-wl-card px-3 py-1.5 text-sm font-medium text-wl-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-wl-teal/30"
                  aria-label="Client"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              }
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyPatternsForClient}
                    margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis
                      dataKey="month"
                      tick={CHART_TICK_SM}
                      tickFormatter={(d) =>
                        format(parseISO(`${String(d)}-01`), 'MMM')
                      }
                    />
                    <YAxis
                      tick={CHART_TICK}
                      tickFormatter={(v) => fmtInt(Number(v))}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={(d) =>
                        format(parseISO(`${String(d)}-01`), 'MMMM yyyy')
                      }
                      formatter={(value, name) => [
                        fmtInt(Number(value)),
                        name,
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={32}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    {COMMS_CATEGORIES.map((cat) => (
                      <Bar
                        key={cat}
                        dataKey={cat}
                        stackId="a"
                        fill={COMMS_CATEGORY_COLORS[cat]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title="AI-predicted upcoming needs"
              subtitle="Items the predictor expects clients to need soon, ranked by due date."
            >
              <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {upcomingPredictedNeeds.map((n) => {
                  const client = clients.find((c) => c.id === n.clientId)
                  const due = parseISO(n.dueDate)
                  const remindOn = format(subDays(due, 1), 'MMM d')
                  const pat =
                    patternTrends.find((p) => p.id === n.sourcePatternId) ??
                    null
                  const conf = Math.round(n.confidence * 100)
                  return (
                    <li
                      key={n.id}
                      className="rounded-xl border border-wl-surface bg-wl-page px-3 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-wl-teal-soft text-wl-teal-muted">
                              <Sparkles className="h-3.5 w-3.5" />
                            </span>
                            <span className="font-semibold text-wl-ink">
                              {n.title}
                            </span>
                            <span className="text-xs text-wl-ink-muted">
                              {client?.name}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-wl-ink-muted">
                            {n.detail}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-wl-ink-muted">
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="h-3.5 w-3.5" />
                              Due{' '}
                              <span className="font-semibold text-wl-ink">
                                {format(due, 'MMM d, yyyy')}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Bell className="h-3.5 w-3.5 text-wl-teal" />
                              Reminder email scheduled for{' '}
                              <span className="font-semibold text-wl-teal-muted">
                                {remindOn}
                              </span>
                            </span>
                            {pat && (
                              <button
                                type="button"
                                onClick={() => setPatternDrillId(pat.id)}
                                className="inline-flex items-center gap-1 text-wl-teal hover:underline"
                              >
                                <Activity className="h-3.5 w-3.5" />
                                Source pattern · {pat.label}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-wl-ink-muted">
                            Confidence
                          </div>
                          <div
                            className={cn(
                              'text-base font-bold tabular-nums',
                              conf >= 85
                                ? 'text-emerald-600'
                                : conf >= 70
                                  ? 'text-amber-600'
                                  : 'text-wl-ink-muted',
                            )}
                          >
                            {fmtInt(conf)}%
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-3 text-[11px] text-wl-ink-muted">
                Demo only — reminders aren't actually being sent. Hook this up
                to your firm's notification service when ready.
              </p>
            </Card>
          </div>
        )}

        {nav === 'comms' && commsSub === 'response' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['patterns', 'Communications patterns'],
                  ['response', 'Response time'],
                  ['email', 'Email volume'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCommsSub(id)}
                  className={cn(
                    'rounded-md px-3.5 py-1.5 text-sm font-medium leading-[1.23rem] transition-colors',
                    commsSub === id
                      ? 'bg-wl-teal-soft text-wl-teal-muted'
                      : 'text-wl-ink-muted hover:bg-wl-surface/50 hover:text-wl-ink',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <Card
              title="Response-time alerts"
              subtitle="Get notified when a client's median response time crosses your threshold."
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-wl-orange/10 text-wl-orange">
                  <Bell className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-wl-ink">
                  Alert when client median is
                </span>
                <select
                  value={respAlertDirection}
                  onChange={(e) =>
                    setRespAlertDirection(
                      e.target.value as 'above' | 'below',
                    )
                  }
                  className="rounded-lg border border-wl-surface bg-wl-card px-3 py-1.5 text-sm font-medium text-wl-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-wl-teal/30"
                  aria-label="Alert direction"
                >
                  <option value="above">above</option>
                  <option value="below">below</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={respAlertThreshold}
                  onChange={(e) =>
                    setRespAlertThreshold(
                      Math.max(0, Number(e.target.value) || 0),
                    )
                  }
                  className="w-24 rounded-lg border border-wl-surface bg-wl-card px-3 py-1.5 text-sm font-medium tabular-nums text-wl-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-wl-teal/30"
                  aria-label="Threshold in minutes"
                />
                <span className="text-sm font-medium text-wl-ink-muted">
                  minutes
                </span>
              </div>
              <div className="mt-4">
                {respAlerts.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-wl-surface bg-wl-page py-6 text-center text-xs text-wl-ink-muted">
                    No clients are currently {respAlertDirection} the{' '}
                    {fmtMinutes(respAlertThreshold)} threshold.
                  </p>
                ) : (
                  <div className="rounded-xl border border-wl-surface bg-wl-page p-2">
                    <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-wl-ink-muted">
                      <span>
                        <span className="font-semibold text-wl-orange">
                          {fmtInt(respAlerts.length)}
                        </span>{' '}
                        of {fmtInt(respByClient.length)} clients{' '}
                        {respAlertDirection} {fmtMinutes(respAlertThreshold)}
                      </span>
                      {respAlerts.length > 5 && (
                        <span className="text-[10px] uppercase tracking-wide">
                          Scroll for more
                        </span>
                      )}
                    </div>
                    <ul
                      className="max-h-72 space-y-2 overflow-y-auto pr-1"
                      role="list"
                    >
                    {respAlerts.map((a) => {
                      const sev = responseSeverity(a.median)
                      return (
                      <li
                        key={a.clientId}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-xl px-3 py-2',
                          SEVERITY_BADGE[sev],
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/60',
                              SEVERITY_TEXT[sev],
                            )}
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-wl-ink">
                              {a.clientName}
                            </div>
                            <div className="truncate text-xs text-wl-ink-muted">
                              Median{' '}
                              <span
                                className={cn(
                                  'font-semibold',
                                  SEVERITY_TEXT[sev],
                                )}
                              >
                                {fmtMinutes(a.median)}
                              </span>{' '}
                              · threshold {fmtMinutes(respAlertThreshold)}
                            </div>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide',
                            SEVERITY_BADGE[sev],
                          )}
                        >
                          {SEVERITY_LABEL[sev]}
                        </span>
                      </li>
                      )
                    })}
                    </ul>
                  </div>
                )}
              </div>
              <p className="mt-3 text-[11px] text-wl-ink-muted">
                Demo only — settings reset on reload. In production these would post to your firm's notification service.
              </p>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card title="Team median response">
                {(() => {
                  const sev = responseSeverity(teamMedian)
                  return (
                    <>
                      <div className="flex items-baseline gap-3">
                        <p
                          className={cn(
                            'text-3xl font-bold',
                            SEVERITY_TEXT[sev],
                          )}
                        >
                          {fmtMinutes(teamMedian)}
                        </p>
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                            SEVERITY_BADGE[sev],
                          )}
                        >
                          {SEVERITY_LABEL[sev]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-wl-ink-muted">
                        Across all client–staff pairs
                      </p>
                    </>
                  )
                })()}
              </Card>
              <Card title="Fastest quartile (staff)">
                {(() => {
                  const m = respByStaff[0]?.median
                  if (m == null) {
                    return (
                      <p className="text-3xl font-bold text-wl-ink">—</p>
                    )
                  }
                  const sev = responseSeverity(m)
                  return (
                    <>
                      <div className="flex items-baseline gap-3">
                        <p
                          className={cn(
                            'text-3xl font-bold',
                            SEVERITY_TEXT[sev],
                          )}
                        >
                          {fmtMinutes(m)}
                        </p>
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                            SEVERITY_BADGE[sev],
                          )}
                        >
                          {SEVERITY_LABEL[sev]}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-wl-ink-muted">
                        {respByStaff[0]?.name}
                      </p>
                    </>
                  )
                })()}
              </Card>
              <Card title="Slowest median (staff)">
                {(() => {
                  const last = respByStaff[respByStaff.length - 1]
                  if (last?.median == null) {
                    return (
                      <p className="text-3xl font-bold text-wl-ink">—</p>
                    )
                  }
                  const sev = responseSeverity(last.median)
                  return (
                    <>
                      <div className="flex items-baseline gap-3">
                        <p
                          className={cn(
                            'text-3xl font-bold',
                            SEVERITY_TEXT[sev],
                          )}
                        >
                          {fmtMinutes(last.median)}
                        </p>
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                            SEVERITY_BADGE[sev],
                          )}
                        >
                          {SEVERITY_LABEL[sev]}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-wl-ink-muted">
                        {last.name}
                      </p>
                    </>
                  )
                })()}
              </Card>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-wl-surface bg-wl-card px-4 py-2 text-[11px] text-wl-ink-muted">
              <span className="font-semibold uppercase tracking-wide">
                Severity scale
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                <span>
                  <span className="font-semibold text-emerald-600">Fast</span>{' '}
                  &lt; 2h
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />
                <span>
                  <span className="font-semibold text-amber-600">Warning</span>{' '}
                  2 – 4h
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-wl-orange" />
                <span>
                  <span className="font-semibold text-wl-orange">Critical</span>{' '}
                  ≥ 4h
                </span>
              </span>
            </div>

            <Card
              title="Response time trend"
              subtitle="Daily team median over the last 6 months — are we trending up or down?"
            >
              {(() => {
                const sevNow = responseSeverity(respTrend.last14Avg)
                const improving = respTrend.change < 0
                const flat = Math.abs(respTrend.change) < 0.02
                const TrendIcon = flat
                  ? null
                  : improving
                    ? TrendingDown
                    : TrendingUp
                const pct = Math.abs(respTrend.change) * 100
                const direction = flat
                  ? 'flat'
                  : improving
                    ? 'improvement'
                    : 'regression'
                const directionColor = flat
                  ? 'text-wl-ink-muted'
                  : improving
                    ? 'text-emerald-600'
                    : 'text-wl-orange'
                return (
                  <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-wl-ink-muted">
                        Last 14d avg
                      </span>
                      <span
                        className={cn(
                          'text-2xl font-bold tabular-nums',
                          SEVERITY_TEXT[sevNow],
                        )}
                      >
                        {fmtMinutes(respTrend.last14Avg)}
                      </span>
                    </div>
                    <span className="text-xs text-wl-ink-muted">
                      vs first 14d:{' '}
                      <span className="font-semibold text-wl-ink">
                        {fmtMinutes(respTrend.first14Avg)}
                      </span>
                    </span>
                    {TrendIcon && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md bg-wl-page px-2 py-0.5 text-xs font-semibold tabular-nums',
                          directionColor,
                        )}
                      >
                        <TrendIcon className="h-3.5 w-3.5" />
                        {fmtFixed(pct, 1)}% {direction}
                      </span>
                    )}
                    {flat && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-wl-page px-2 py-0.5 text-xs font-semibold text-wl-ink-muted">
                        Roughly flat
                      </span>
                    )}
                  </div>
                )
              })()}
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={respTrend.series}
                    margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis
                      dataKey="date"
                      tick={CHART_TICK_SM}
                      minTickGap={48}
                      tickFormatter={(d) => format(parseISO(String(d)), 'MMM d')}
                    />
                    <YAxis
                      tick={CHART_TICK}
                      width={64}
                      tickFormatter={(v) => fmtMinutes(Number(v))}
                      domain={[0, (max: number) => Math.ceil((max + 30) / 30) * 30]}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={(d) =>
                        format(parseISO(String(d)), 'EEE, MMM d, yyyy')
                      }
                      formatter={(value, name) => [
                        fmtMinutes(Number(value)),
                        name,
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={28}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    <ReferenceLine
                      y={FAST_MAX_MIN}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Fast (2h)',
                        fill: '#059669',
                        fontSize: 10,
                        position: 'right',
                      }}
                    />
                    <ReferenceLine
                      y={WARNING_MAX_MIN}
                      stroke="#ff8500"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Critical (4h)',
                        fill: '#ff8500',
                        fontSize: 10,
                        position: 'right',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="medianMinutes"
                      name="Daily median"
                      stroke="#06b6d4"
                      strokeOpacity={0.45}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="rolling14"
                      name="14-day avg"
                      stroke="#0e7490"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Filter — staff included in rollups">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRespStaffFilter(null)}
                  className={cn(
                    'rounded-md px-3.5 py-1.5 text-sm font-medium leading-[1.23rem] transition-colors',
                    respStaffFilter === null
                      ? 'bg-wl-teal-soft text-wl-teal-muted'
                      : 'text-wl-ink-muted hover:bg-wl-surface/50 hover:text-wl-ink',
                  )}
                >
                  All staff
                </button>
                {staff.slice(0, 6).map((s) => {
                  const on =
                    respStaffFilter !== null && respStaffFilter.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        if (respStaffFilter === null) {
                          setRespStaffFilter([s.id])
                        } else if (respStaffFilter.includes(s.id)) {
                          const next = respStaffFilter.filter((x) => x !== s.id)
                          setRespStaffFilter(next.length === 0 ? null : next)
                        } else {
                          setRespStaffFilter([...respStaffFilter, s.id])
                        }
                      }}
                      className={cn(
                        'rounded-md px-3.5 py-1.5 text-sm font-medium leading-[1.23rem] transition-colors',
                        on
                          ? 'bg-wl-teal-soft text-wl-teal-muted'
                          : 'border border-wl-surface bg-wl-card text-wl-ink-muted hover:text-wl-ink',
                      )}
                    >
                      {s.initials}
                    </button>
                  )
                })}
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Median response by staff">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={respByStaff}
                      layout="vertical"
                      margin={{ left: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis
                        type="number"
                        tick={CHART_TICK}
                        tickFormatter={(v) => fmtMinutes(Number(v))}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={CHART_TICK_SM}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value) => fmtMinutes(Number(value))}
                      />
                      <Bar dataKey="median" radius={[0, 6, 6, 0]}>
                        {respByStaff.map((row, i) => (
                          <Cell
                            key={i}
                            fill={SEVERITY_FILL[responseSeverity(row.median)]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card title="By client contact / role">
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1 text-sm">
                  {respByContactPriority
                    .sort((a, b) => a.median - b.median)
                    .map((row) => {
                      const sev = responseSeverity(row.median)
                      return (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-wl-surface bg-wl-page px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-wl-ink">
                            {row.name}
                          </div>
                          <div className="truncate text-xs text-wl-ink-muted">
                            {row.role} · {row.clientName}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <div className="text-right">
                            <div
                              className={cn(
                                'tabular-nums font-semibold',
                                SEVERITY_TEXT[sev],
                              )}
                            >
                              {fmtMinutes(row.median)}
                            </div>
                            <span
                              className={cn(
                                'mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                                row.priority === 'critical' &&
                                  'bg-wl-orange/15 text-wl-orange',
                                row.priority === 'high' &&
                                  'bg-wl-teal-soft text-wl-teal-muted',
                                row.priority === 'standard' &&
                                  'bg-wl-surface text-wl-ink',
                                row.priority === 'low' &&
                                  'bg-slate-100 text-wl-ink-muted',
                              )}
                            >
                              {row.priority}
                            </span>
                          </div>
                          <span
                            className={cn(
                              'inline-block h-8 w-1 rounded-full',
                              sev === 'fast' && 'bg-emerald-500',
                              sev === 'warning' && 'bg-amber-500',
                              sev === 'critical' && 'bg-wl-orange',
                            )}
                            aria-hidden
                          />
                        </div>
                      </div>
                      )
                    })}
                </div>
              </Card>
            </div>
          </div>
        )}

        {nav === 'sentiment' && (
          <div className="space-y-6">
            <Card
              title="Client sentiment"
              subtitle="Rolling score by client and window length."
            >
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-2 text-sm">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-wl-ink-muted">
                        Client
                      </th>
                      {[2, 4, 8, 12].map((w) => (
                        <th
                          key={w}
                          className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-wl-ink-muted"
                        >
                          Last {w} wks
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c) => (
                      <tr key={c.id}>
                        <td className="px-2 py-1 text-left font-medium text-wl-ink">
                          {c.name}
                        </td>
                        {([2, 4, 8, 12] as const).map((w) => {
                          const cell = sentimentCells.find(
                            (s) =>
                              s.clientId === c.id && s.windowWeeks === w,
                          )!
                          return (
                            <td key={w} className="p-0">
                              <div
                                className="flex min-h-12 flex-col justify-center rounded-xl px-2 py-2 text-center"
                                style={{
                                  background: sentimentColor(cell.score),
                                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                                }}
                                title={`Vol: ${fmtInt(cell.volume)} · trend: ${cell.trend}`}
                              >
                                <span className="text-sm font-semibold text-slate-950">
                                  {cell.score > 0 ? '+' : ''}
                                  {fmtFixed(cell.score, 2)}
                                </span>
                                <span className="text-[10px] font-medium text-slate-900/80">
                                  {fmtInt(cell.volume)} msgs
                                </span>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-wl-ink-muted">
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-3 w-8 rounded bg-red-500" /> Frustrated
                </span>
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-3 w-8 rounded bg-amber-400" /> Mixed
                </span>
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-3 w-8 rounded bg-emerald-500" /> Positive
                </span>
              </div>
            </Card>
          </div>
        )}

        {nav === 'comms' && commsSub === 'email' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['patterns', 'Communications patterns'],
                  ['response', 'Response time'],
                  ['email', 'Email volume'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCommsSub(id)}
                  className={cn(
                    'rounded-md px-3.5 py-1.5 text-sm font-medium leading-[1.23rem] transition-colors',
                    commsSub === id
                      ? 'bg-wl-teal-soft text-wl-teal-muted'
                      : 'text-wl-ink-muted hover:bg-wl-surface/50 hover:text-wl-ink',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <Card
              title="Email volume vs logged time"
              subtitle="Recent weeks — team totals and per staff member."
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={last4WeeksEmail}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="week" tick={CHART_TICK_SM} />
                      <YAxis
                        yAxisId="left"
                        tick={CHART_TICK}
                        tickFormatter={(v) => fmtInt(Number(v))}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={CHART_TICK}
                        tickFormatter={(v) => fmtFixed(Number(v), 1)}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value, name) => {
                          const v = Number(value ?? 0)
                          const text =
                            name === 'Team emails sent'
                              ? fmtInt(v)
                              : fmtFixed(v, 1)
                          return [text, name]
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="_team_sent"
                        name="Team emails sent"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="_team_hours"
                        name="Team logged hrs"
                        stroke="#ff8500"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto text-sm">
                  {staff.map((s) => {
                    const last = weeklyEmailVolume.filter((w) => w.staffId === s.id).slice(-4)
                    const sent = last.reduce((a, x) => a + x.sent, 0)
                    const hrs = last.reduce((a, x) => a + x.loggedHours, 0)
                    const ratio = hrs ? sent / hrs : 0
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-wl-surface bg-wl-card px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-wl-teal-soft text-xs font-bold text-wl-teal-muted">
                            {s.initials}
                          </span>
                          <div>
                            <div className="font-medium text-wl-ink">{s.name}</div>
                            <div className="text-xs text-wl-ink-muted">
                              Last 4 wks · {fmtInt(sent)} sent ·{' '}
                              {fmtFixed(Math.round(hrs * 10) / 10, 1)}h logged
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold uppercase tracking-wide text-wl-ink-muted">
                            Sends / hour
                          </div>
                          <div className="text-lg tabular-nums font-semibold text-wl-ink">
                            {fmtFixed(Math.round(ratio * 10) / 10, 1)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>

            <Card
              title="Inbound emails from clients"
              subtitle="Last 12 weeks — how many messages clients are sending us."
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={inboundWeekly}
                      margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis
                        dataKey="week"
                        tick={CHART_TICK_SM}
                        tickFormatter={(d) =>
                          format(parseISO(String(d)), 'MMM d')
                        }
                      />
                      <YAxis
                        tick={CHART_TICK}
                        tickFormatter={(v) => fmtInt(Number(v))}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelFormatter={(d) =>
                          `Week of ${format(parseISO(String(d)), 'MMM d, yyyy')}`
                        }
                        formatter={(value) => [
                          fmtInt(Number(value)),
                          'Inbound emails',
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Inbound emails"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-wl-ink-muted">
                    <span>Top clients · last 4 weeks</span>
                    <span className="tabular-nums">
                      {fmtInt(
                        inboundTopClients.reduce(
                          (a, x) => a + x.received,
                          0,
                        ),
                      )}{' '}
                      total
                    </span>
                  </div>
                  <ul className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
                    {inboundTopClients.map((c, i) => {
                      const max = inboundTopClients[0]?.received ?? 1
                      const pct = max ? (c.received / max) * 100 : 0
                      return (
                        <li
                          key={c.clientId}
                          className="rounded-lg border border-wl-surface bg-wl-page px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-wl-teal-soft text-[10px] font-bold tabular-nums text-wl-teal-muted">
                                {i + 1}
                              </span>
                              <span className="truncate font-medium text-wl-ink">
                                {c.clientName}
                              </span>
                            </span>
                            <span className="shrink-0 tabular-nums font-semibold text-wl-ink">
                              {fmtInt(c.received)}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-wl-surface">
                            <div
                              className="h-full rounded-full bg-wl-teal"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}

        {nav === 'onboarding' && (
          <div className="space-y-6">
            <Card
              title="Client onboarding"
              subtitle="Stages, owners, and checklist progress."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {onboardingState.map((ob) => {
                  const owner = staff.find((x) => x.id === ob.ownerStaffId)
                  return (
                    <div
                      key={ob.id}
                      className="flex flex-col rounded-2xl border border-wl-surface bg-wl-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-base font-bold text-wl-ink">
                            {ob.clientName}
                          </h4>
                          <p className="mt-1 text-xs text-wl-ink-muted">
                            Owner: {owner?.name} · Target: {ob.targetGoLive}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md bg-wl-teal-soft px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-wl-teal-muted">
                          {ob.stage}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs text-wl-ink-muted">
                          <span>Progress</span>
                          <span className="font-semibold text-wl-ink">
                            {fmtInt(ob.percentComplete)}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-wl-surface">
                          <div
                            className="h-full rounded-full bg-wl-teal"
                            style={{ width: `${ob.percentComplete}%` }}
                          />
                        </div>
                      </div>
                      <ul className="mt-4 space-y-2 text-sm text-wl-ink">
                        {ob.steps.map((step, stepIndex) => (
                          <li key={`${ob.id}-step-${stepIndex}`}>
                            <button
                              type="button"
                              onClick={() =>
                                toggleOnboardingStep(ob.id, stepIndex)
                              }
                              className="flex w-full items-start gap-2 rounded-xl py-0.5 text-left transition hover:bg-wl-teal-soft/60"
                            >
                              <span
                                className={cn(
                                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px]',
                                  step.done
                                    ? 'border-wl-teal bg-wl-teal text-white'
                                    : 'border-wl-surface bg-wl-card text-wl-ink-muted',
                                )}
                                aria-hidden
                              >
                                {step.done ? '✓' : ''}
                              </span>
                              <span>
                                {step.label}
                                {step.owner && (
                                  <span className="ml-1 text-xs text-wl-ink-muted">
                                    ({step.owner})
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => setOnboardingDetailId(ob.id)}
                        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-wl-teal hover:text-wl-teal-muted"
                      >
                        Open detail
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )}
      </main>

      {patternDrillId != null && patternDrill && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-wl-ink/40 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPatternDrillId(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pattern-drill-title"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-wl-card shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-wl-surface px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{
                      background:
                        COMMS_CATEGORY_COLORS[patternDrill.trend.category],
                    }}
                    aria-hidden
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
                    {patternDrill.trend.category}
                  </span>
                </div>
                <h3
                  id="pattern-drill-title"
                  className="mt-1 text-lg font-bold text-wl-ink"
                >
                  {patternDrill.trend.label}
                </h3>
                <p className="mt-0.5 text-xs text-wl-ink-muted">
                  Last 12 weeks ·{' '}
                  {fmtInt(
                    patternDrill.trend.weeklyVolumes.reduce(
                      (a, x) => a + x,
                      0,
                    ),
                  )}{' '}
                  messages tagged
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPatternDrillId(null)}
                aria-label="Close"
                className="rounded-xl p-2 text-wl-ink-muted transition hover:bg-wl-teal-soft hover:text-wl-teal-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
                  Why this pattern was tagged
                </h4>
                <p className="mt-2 rounded-xl border border-wl-surface bg-wl-page px-3 py-3 text-sm text-wl-ink">
                  The classifier flagged threads with subject lines and body
                  language matching the{' '}
                  <span className="font-semibold">
                    {patternDrill.trend.label.toLowerCase()}
                  </span>{' '}
                  template. Demo placeholder — production text will surface
                  the AI's exact reasoning + classification confidence.
                </p>
              </div>
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
                  Sample messages ({patternDrill.samples.length})
                </h4>
                <ul className="mt-2 space-y-2">
                  {patternDrill.samples.map((s, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-wl-surface bg-wl-page px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-wl-ink-muted">
                        <span>
                          <span className="font-semibold text-wl-ink">
                            {s.fromContact}
                          </span>{' '}
                          → {s.toStaff}
                        </span>
                        <span>
                          {format(parseISO(s.date), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-wl-ink">{s.snippet}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-dashed border-wl-teal/40 bg-wl-teal-soft/30 px-3 py-3 text-xs text-wl-teal-muted">
                <strong className="text-wl-teal">Suggested action:</strong>{' '}
                If this pattern keeps growing in the "Ad hoc requests"
                bucket, consider promoting it to a recurring engagement so
                the firm bills it predictably.
              </div>
            </div>
          </div>
        </div>
      )}

      {sentimentDrill != null && sentimentDrillData && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-wl-ink/40 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSentimentDrill(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sentiment-drill-title"
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-wl-card shadow-2xl"
          >
            {(() => {
              const { cell, samples, pairs } = sentimentDrillData
              const lvl = sentimentLevel(cell.score)
              const style = SENT_STYLE[lvl]
              const Icon = style.Icon
              const client = clients.find((c) => c.id === cell.clientId)
              const startDate = format(
                subDays(parseISO(cell.periodEnd), 13),
                'MMM d',
              )
              const endDate = format(parseISO(cell.periodEnd), 'MMM d, yyyy')
              const clientStaff = staff.slice(0, 5)
              const clientPeople = clientContacts.filter(
                (c) => c.clientId === cell.clientId,
              )
              return (
                <>
                  <div className="flex items-start justify-between gap-3 border-b border-wl-surface px-5 py-4">
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
                        Sentiment analysis profile
                      </span>
                      <h3
                        id="sentiment-drill-title"
                        className="mt-1 flex flex-wrap items-center gap-3 text-lg font-bold text-wl-ink"
                      >
                        {client?.name}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
                            style.bg,
                            style.border,
                            style.text,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {style.label}
                        </span>
                      </h3>
                      <p className="mt-0.5 text-xs text-wl-ink-muted">
                        Window {startDate} — {endDate} ·{' '}
                        {fmtInt(cell.msgCount)} messages analyzed
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSentimentDrill(null)}
                      aria-label="Close"
                      className="rounded-xl p-2 text-wl-ink-muted transition hover:bg-wl-teal-soft hover:text-wl-teal-muted"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
                        Why this score
                      </h4>
                      <ul className="mt-2 space-y-2">
                        {(samples?.reasons ?? [cell.topReason]).map((r, i) => (
                          <li
                            key={i}
                            className="rounded-xl border border-wl-surface bg-wl-page px-3 py-2 text-sm text-wl-ink"
                          >
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
                        Sample messages
                      </h4>
                      <ul className="mt-2 space-y-2">
                        {(samples?.excerpts ?? []).map((x, i) => (
                          <li
                            key={i}
                            className="rounded-xl border border-wl-surface bg-wl-page px-3 py-2"
                          >
                            <div className="flex items-center justify-between text-[11px] text-wl-ink-muted">
                              <span className="font-semibold text-wl-ink">
                                {x.fromName}
                              </span>
                              <span>
                                {format(parseISO(x.date), 'MMM d, yyyy')}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-wl-ink">
                              {x.snippet}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Network className="h-3.5 w-3.5" />
                          Person-to-person sentiment
                        </span>
                      </h4>
                      <p className="mt-1 text-xs text-wl-ink-muted">
                        Each cell shows how the client contact feels
                        interacting with that staff member.
                      </p>
                      <div className="mt-2 overflow-x-auto">
                        <table className="min-w-full border-collapse text-xs">
                          <thead>
                            <tr>
                              <th className="border border-wl-surface bg-wl-page px-2 py-2 text-left font-semibold text-wl-ink-muted">
                                Client contact ↓ · Staff →
                              </th>
                              {clientStaff.map((st) => (
                                <th
                                  key={st.id}
                                  className="border border-wl-surface bg-wl-page px-2 py-2 text-center font-semibold text-wl-ink"
                                  title={st.name}
                                >
                                  {st.initials}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {clientPeople.map((person) => (
                              <tr key={person.id}>
                                <td className="border border-wl-surface bg-wl-page px-2 py-2 font-medium text-wl-ink">
                                  <div className="truncate">{person.name}</div>
                                  <div className="truncate text-[10px] text-wl-ink-muted">
                                    {person.role}
                                  </div>
                                </td>
                                {clientStaff.map((st) => {
                                  const pair = pairs.find(
                                    (p) =>
                                      p.contactId === person.id &&
                                      p.staffId === st.id,
                                  )
                                  if (!pair) {
                                    return (
                                      <td
                                        key={st.id}
                                        className="border border-wl-surface bg-wl-page px-2 py-2 text-center text-wl-ink-muted"
                                      >
                                        —
                                      </td>
                                    )
                                  }
                                  const pl = sentimentLevel(pair.score)
                                  const ps = SENT_STYLE[pl]
                                  const PIcon = ps.Icon
                                  return (
                                    <td
                                      key={st.id}
                                      className={cn(
                                        'border border-wl-surface px-2 py-2 text-center',
                                        ps.bg,
                                      )}
                                      title={pair.note}
                                    >
                                      <PIcon
                                        className={cn(
                                          'mx-auto h-4 w-4',
                                          ps.text,
                                        )}
                                      />
                                      <div className="mt-0.5 text-[10px] text-wl-ink-muted">
                                        {fmtInt(pair.msgCount)}
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="mt-2 text-[11px] text-wl-ink-muted">
                        Hover any cell for the AI's note on that
                        relationship.
                      </p>
                    </div>

                    <div className="rounded-xl border border-dashed border-wl-teal/40 bg-wl-teal-soft/30 px-3 py-3 text-xs text-wl-teal-muted">
                      <strong className="text-wl-teal">
                        Suggested next steps:
                      </strong>{' '}
                      Schedule a check-in with the client lead;
                      reassign threads where the matrix shows red cells.
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {onboardingDetailId != null && onboardingDetail && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-wl-ink/40 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOnboardingDetailId(null)
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-wl-surface bg-wl-card shadow-2xl"
            role="dialog"
            aria-labelledby="onboarding-detail-title"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-wl-surface bg-wl-card px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-wl-teal">
                  Onboarding detail
                </p>
                <h2
                  id="onboarding-detail-title"
                  className="text-lg font-bold text-wl-ink"
                >
                  {onboardingState.find((o) => o.id === onboardingDetailId)
                    ?.clientName ?? 'Client'}
                </h2>
                <p className="mt-1 text-xs text-wl-ink-muted">
                  {onboardingState.find((o) => o.id === onboardingDetailId)
                    ?.stage ?? ''}{' '}
                  ·{' '}
                  {fmtInt(
                    onboardingState.find((o) => o.id === onboardingDetailId)
                      ?.percentComplete ?? 0,
                  )}
                  % complete
                </p>
              </div>
              <button
                type="button"
                className="rounded-xl p-2 text-wl-ink-muted transition hover:bg-wl-teal-soft hover:text-wl-teal-muted"
                onClick={() => setOnboardingDetailId(null)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 px-5 py-4 text-sm text-wl-ink">
              <p className="leading-relaxed text-wl-ink-muted">
                {onboardingDetail.executiveSummary}
              </p>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-wl-ink-muted">
                  Milestones
                </h3>
                <ul className="space-y-2">
                  {onboardingDetail.milestones.map((m) => (
                    <li
                      key={`${m.date}-${m.label}`}
                      className="flex flex-col gap-1 border-b border-wl-surface pb-3 text-xs last:border-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-semibold text-wl-ink">{m.label}</span>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className="tabular-nums text-wl-ink-muted">
                          {m.date}
                        </span>
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase',
                            m.status === 'done' &&
                              'bg-wl-teal-soft text-wl-teal-muted',
                            m.status === 'upcoming' &&
                              'bg-wl-surface text-wl-ink-muted',
                            m.status === 'at-risk' &&
                              'bg-wl-orange/15 text-wl-orange',
                          )}
                        >
                          {m.status === 'at-risk'
                            ? 'At risk'
                            : m.status === 'done'
                              ? 'Done'
                              : 'Upcoming'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {onboardingDetail.blockers.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-wl-orange">
                    Blockers
                  </h3>
                  <ul className="list-inside list-disc space-y-1 text-xs text-wl-ink-muted">
                    {onboardingDetail.blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-wl-ink-muted">
                  Client contacts
                </h3>
                <ul className="space-y-1 text-xs">
                  {onboardingDetail.clientContacts.map((c) => (
                    <li key={c.name}>
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-wl-ink-muted"> — {c.role}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="rounded-xl bg-wl-teal-soft px-3 py-2 text-xs font-semibold text-wl-teal-muted">
                Next sync: {onboardingDetail.nextSync}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
