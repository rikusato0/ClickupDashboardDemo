import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Building2,
  CalendarRange,
  ChevronRight,
  Clock,
  Download,
  HeartPulse,
  Inbox,
  Mail,
  Rocket,
  Sparkles,
  Users,
} from 'lucide-react'
import {
  type TaskType,
  TASK_TYPES,
  clientContacts,
  clients,
  demoDateRange,
  onboardingClients,
  responseByContact,
  sentimentCells,
  staff,
  teamMedianResponseMinutes,
  timeEntries,
  type TimeEntry,
  weeklyEmailVolume,
} from './data/demo'
import { eachDayOfInterval, format, parseISO } from 'date-fns'

type NavId =
  | 'timesheets'
  | 'response'
  | 'sentiment'
  | 'email'
  | 'onboarding'

const NAV: { id: NavId; label: string; icon: typeof Clock }[] = [
  { id: 'timesheets', label: 'Timesheets', icon: Clock },
  { id: 'response', label: 'Response time', icon: Inbox },
  { id: 'sentiment', label: 'Client sentiment', icon: HeartPulse },
  { id: 'email', label: 'Email volume', icon: Mail },
  { id: 'onboarding', label: 'Client onboarding', icon: Rocket },
]

const TASK_COLORS: Record<TaskType, string> = {
  'One-time': '#6ed1d6',
  Recurring: '#6daaac',
  OT: '#ff8500',
  'Month end': '#4a8f94',
  Payroll: '#8ab8b8',
}

const CHART_GRID = '#c8d6d6'
const CHART_TICK = { fill: '#5c6f6f', fontSize: 11 }
const CHART_TICK_SM = { fill: '#5c6f6f', fontSize: 10 }
const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid #aabcbb',
  borderRadius: 12,
  color: '#2d3a3a',
}

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ')
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
        'rounded-2xl border border-wl-surface/50 bg-wl-card shadow-sm shadow-wl-teal-muted/15',
        className,
      )}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-wl-surface/40 px-5 py-4">
          <div>
            {title && (
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-wl-teal">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-wl-ink-muted">{subtitle}</p>
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
  const [nav, setNav] = useState<NavId>('timesheets')
  const [dateFrom, setDateFrom] = useState(
    format(demoDateRange.start, 'yyyy-MM-dd'),
  )
  const [dateTo, setDateTo] = useState(format(demoDateRange.end, 'yyyy-MM-dd'))
  const [filterStaff, setFilterStaff] = useState<string[] | null>(null)
  const [filterClients, setFilterClients] = useState<string[] | null>(null)
  const [filterTaskTypes, setFilterTaskTypes] = useState<TaskType[] | null>(
    null,
  )
  const [tsSub, setTsSub] = useState<
    'overview' | 'by_client' | 'by_type' | 'by_staff' | 'export'
  >('overview')
  const [exportStaffId, setExportStaffId] = useState(staff[0]!.id)
  const [respStaffFilter, setRespStaffFilter] = useState<string[] | null>(null)

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

  const exportDays = useMemo(() => {
    const days = eachDayOfInterval({
      start: parseISO(dateFrom),
      end: parseISO(dateTo),
    }).filter((d) => d.getDay() !== 0 && d.getDay() !== 6)
    const labels = days.map((d) => format(d, 'EEE M/d'))
    const keys = days.map((d) => format(d, 'yyyy-MM-dd'))
    const row: Record<string, string | number> = { name: 'Hours' }
    let total = 0
    keys.forEach((k, i) => {
      const hrs =
        Math.round(
          filtered
            .filter((e) => e.staffId === exportStaffId && e.date === k)
            .reduce((a, e) => a + e.hours, 0) * 100,
        ) / 100
      row[labels[i]!] = hrs || '—'
      total += hrs
    })
    row.total = Math.round(total * 100) / 100
    return { labels, row, keys }
  }, [filtered, dateFrom, dateTo, exportStaffId])

  const teamMedian = teamMedianResponseMinutes()

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

  return (
    <div className="flex min-h-svh text-wl-ink">
      <div
        className="sticky top-0 hidden h-svh w-1.5 shrink-0 bg-wl-teal sm:block"
        aria-hidden
      />
      <aside className="sticky top-0 flex h-svh w-56 shrink-0 flex-col bg-wl-teal-muted px-3 py-6 text-white shadow-md">
        <div className="mb-8 flex items-center gap-3 px-2">
          <img
            src="/white-lotus-mark.svg"
            alt=""
            className="h-11 w-11 shrink-0"
            width={44}
            height={44}
          />
          <div className="min-w-0 text-left">
            <div className="font-display text-[11px] font-bold tracking-[0.14em] text-white">
              WHITE LOTUS
            </div>
            <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-white/80">
              Bookkeeping
            </div>
            <div className="mt-1.5 text-[10px] font-medium text-white/65">
              Firm reports · Demo
            </div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = nav === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setNav(item.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/25 text-white shadow-inner shadow-black/10'
                    : 'text-white/90 hover:bg-white/15 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-95" />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/25 bg-white/10 p-3 text-left text-[11px] leading-relaxed text-white/85">
          Demo only — mock data, no backend. For client review of layout &
          metrics.
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto px-6 py-8 lg:px-10">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-wl-orange">
              <Sparkles className="h-3.5 w-3.5" />
              Stakeholder preview
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-wl-teal md:text-3xl">
              Operational dashboard — proposed modules
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-wl-ink-muted">
              ClickUp remains the system of record for tasks and time; this UI
              shows how pulled-in data could be sliced for firm-level reporting
              (timesheets via API, email metrics via Google Workspace).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-wrap items-center gap-2 rounded-full border border-wl-surface/60 bg-wl-surface/25 px-4 py-2 text-xs">
              <CalendarRange className="h-4 w-4 text-wl-ink-muted" />
              <label className="sr-only" htmlFor="df">
                From
              </label>
              <input
                id="df"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-full border-0 bg-wl-surface px-3 py-2 font-medium uppercase text-wl-ink placeholder:text-wl-ink-muted"
              />
              <span className="text-wl-ink-muted">–</span>
              <label className="sr-only" htmlFor="dt">
                To
              </label>
              <input
                id="dt"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-full border-0 bg-wl-surface px-3 py-2 font-medium uppercase text-wl-ink placeholder:text-wl-ink-muted"
              />
            </div>
          </div>
        </header>

        {nav === 'timesheets' && (
          <div className="space-y-6">
            <Card
              title="ClickUp time entries — API snapshot"
              subtitle="Production would call GET /v2/team/{team_id}/time_entries with start_date / end_date (ms), optional assignee, location filters, and include_task_tags for category mapping."
            >
              <div className="flex flex-wrap gap-2 text-xs text-wl-ink-muted">
                <span className="rounded-full bg-wl-teal/20 px-3 py-1.5 font-medium text-wl-ink">
                  Workspace time entries align with your requirement to keep
                  ClickUp for capture.
                </span>
                <span className="rounded-full bg-wl-surface/40 px-3 py-1.5 text-wl-ink">
                  Task types here are mocked; real build would map tags, custom
                  fields, or list folders to: one-time, recurring, OT, month
                  end, payroll.
                </span>
              </div>
            </Card>

            <div className="flex flex-wrap gap-2 rounded-2xl border border-wl-surface/50 bg-wl-card p-3 shadow-sm">
              <FilterChip
                icon={Users}
                label="Staff"
                options={staff.map((s) => ({ id: s.id, label: s.name }))}
                selected={filterStaff}
                onChange={setFilterStaff}
              />
              <FilterChip
                icon={Building2}
                label="Clients"
                options={clients.map((c) => ({ id: c.id, label: c.name }))}
                selected={filterClients}
                onChange={setFilterClients}
              />
              <FilterChip
                icon={Clock}
                label="Task type"
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
                  ['by_staff', 'By employee'],
                  ['export', 'Daily export'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTsSub(id)}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                    tsSub === id
                      ? 'border-2 border-wl-teal-muted bg-wl-teal-muted text-white shadow-md'
                      : 'border-2 border-wl-orange bg-white text-wl-orange hover:bg-wl-orange/5',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tsSub === 'overview' && (
              <div className="grid gap-6 lg:grid-cols-3">
                <Card title="Total hours (filtered)">
                  <p className="font-display text-3xl font-bold text-wl-orange">
                    {Math.round(
                      filtered.reduce((a, e) => a + e.hours, 0) * 10,
                    ) / 10}
                  </p>
                  <p className="mt-1 text-xs text-wl-ink-muted">
                    {filtered.length} time entries in range
                  </p>
                </Card>
                <Card title="Active clients">
                  <p className="font-display text-3xl font-bold text-wl-teal">
                    {byClient.length}
                  </p>
                  <p className="mt-1 text-xs text-wl-ink-muted">
                    With logged time in filters
                  </p>
                </Card>
                <Card title="Staff contributing">
                  <p className="font-display text-3xl font-bold text-wl-teal-muted">
                    {byStaff.length}
                  </p>
                </Card>
                <Card title="Hours by client" className="lg:col-span-3">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byClient} margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                        <XAxis
                          dataKey="name"
                          tick={CHART_TICK_SM}
                          interval={0}
                          angle={-24}
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis tick={CHART_TICK} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="hours" fill="#6daaac" radius={[6, 6, 0, 0]} />
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
                      <tr className="border-b border-wl-surface/50 text-xs font-semibold uppercase tracking-wide text-wl-ink-muted">
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
                            className="border-b border-wl-surface/30 text-wl-ink"
                          >
                            <td className="py-2 pr-4 font-medium text-wl-ink">
                              {r.name}
                            </td>
                            <td className="py-2 pr-4 tabular-nums">{r.hours}</td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-wl-surface/50">
                                  <div
                                    className="h-full rounded-full bg-wl-teal-muted"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-10 text-right text-xs text-wl-ink-muted">
                                  {pct}%
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
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={byClientType.slice(0, 8)}
                        margin={{ left: 8, right: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                        <XAxis
                          dataKey="client"
                          tick={CHART_TICK_SM}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={64}
                        />
                        <YAxis tick={CHART_TICK} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend />
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
                            className="border-t border-wl-surface/40 text-wl-ink"
                          >
                            <td className="py-2 font-medium text-wl-ink">
                              {row.client}
                            </td>
                            {TASK_TYPES.map((t) => (
                              <td key={t} className="py-2 tabular-nums">
                                {row[t] as number}
                              </td>
                            ))}
                            <td className="py-2 tabular-nums font-semibold text-wl-orange">
                              {row.total as number}
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
              <Card title="Employee summary">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-wl-surface/50 text-xs font-semibold uppercase tracking-wide text-wl-ink-muted">
                        <th className="pb-3 pr-4">Employee</th>
                        <th className="pb-3 pr-4">Hours</th>
                        <th className="pb-3 pr-4">Entries</th>
                        <th className="pb-3">Avg / entry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byStaff.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-wl-surface/30 text-wl-ink"
                        >
                          <td className="py-2 pr-4">
                            <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-wl-teal/25 text-xs font-bold text-wl-teal-muted">
                              {r.initials}
                            </span>
                            {r.name}
                          </td>
                          <td className="py-2 pr-4 tabular-nums font-semibold text-wl-ink">
                            {r.hours}
                          </td>
                          <td className="py-2 pr-4 tabular-nums text-wl-ink-muted">
                            {r.entries}
                          </td>
                          <td className="py-2 tabular-nums text-wl-ink-muted">
                            {r.entries
                              ? Math.round((r.hours / r.entries) * 100) / 100
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
                title="One-click export (mock)"
                subtitle="Pattern: per-employee grid of weekday hours + period total — export to CSV / PDF in production."
                action={
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-wl-teal-muted px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-md transition hover:brightness-110"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                }
              >
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <label className="text-xs font-semibold uppercase text-wl-ink-muted" htmlFor="es">
                    Employee
                  </label>
                  <select
                    id="es"
                    value={exportStaffId}
                    onChange={(e) => setExportStaffId(e.target.value)}
                    className="rounded-full border-0 bg-wl-surface px-4 py-2 text-sm font-medium text-wl-ink"
                  >
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="border border-wl-surface/60 bg-wl-surface/35 px-2 py-2 text-left text-xs font-semibold uppercase text-wl-ink-muted">
                          Employee / day
                        </th>
                        {exportDays.labels.map((l) => (
                          <th
                            key={l}
                            className="border border-wl-surface/60 bg-wl-surface/35 px-2 py-2 text-center text-xs font-semibold text-wl-ink-muted"
                          >
                            {l}
                          </th>
                        ))}
                        <th className="border border-wl-teal-muted/50 bg-wl-teal/20 px-3 py-2 text-center text-xs font-bold uppercase text-wl-teal-muted">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-wl-surface/60 bg-wl-surface/25 px-2 py-2 font-medium text-wl-ink">
                          {staff.find((s) => s.id === exportStaffId)?.name}
                        </td>
                        {exportDays.labels.map((l) => (
                          <td
                            key={l}
                            className="border border-wl-surface/40 px-2 py-2 text-center tabular-nums text-wl-ink"
                          >
                            {exportDays.row[l] as string | number}
                          </td>
                        ))}
                        <td className="border border-wl-teal-muted/40 bg-wl-teal/15 px-3 py-2 text-center text-sm font-bold tabular-nums text-wl-teal-muted">
                          {exportDays.row.total as number}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {nav === 'response' && (
          <div className="space-y-6">
            <Card
              title="Google Workspace — client domain threads (mock)"
              subtitle="Production: Gmail API or audit exports scoped to client domains from company profiles; pair inbound client messages with firm replies to measure latency."
            >
              <p className="text-sm leading-relaxed text-wl-ink-muted">
                Contacts below include{' '}
                <strong className="text-wl-ink">priority / role</strong> so
                SLAs can differ (e.g. faster to Executive Director than AP
                specialist).
              </p>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card title="Team median response">
                <p className="font-display text-3xl font-bold text-wl-teal">
                  {Math.round(teamMedian)}m
                </p>
                <p className="mt-1 text-xs text-wl-ink-muted">
                  Across mocked client–staff pairs in range
                </p>
              </Card>
              <Card title="Fastest quartile (staff)">
                <p className="font-display text-3xl font-bold text-wl-teal-muted">
                  {respByStaff[0]?.median ?? '—'}m
                </p>
                <p className="mt-1 truncate text-xs text-wl-ink-muted">
                  {respByStaff[0]?.name}
                </p>
              </Card>
              <Card title="Needs coaching (mock)">
                <p className="font-display text-3xl font-bold text-wl-orange">
                  {respByStaff[respByStaff.length - 1]?.median ?? '—'}m
                </p>
                <p className="mt-1 truncate text-xs text-wl-ink-muted">
                  {respByStaff[respByStaff.length - 1]?.name}
                </p>
              </Card>
            </div>

            <Card title="Filter — staff included in rollups">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRespStaffFilter(null)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide',
                    respStaffFilter === null
                      ? 'bg-wl-teal-muted text-white'
                      : 'border-2 border-wl-orange bg-white text-wl-orange',
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
                        'rounded-full px-3 py-1.5 text-xs font-semibold',
                        on
                          ? 'bg-wl-teal-muted text-white'
                          : 'border border-wl-ink/15 bg-white text-wl-ink-muted',
                      )}
                    >
                      {s.initials}
                    </button>
                  )
                })}
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Median response by employee">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={respByStaff}
                      layout="vertical"
                      margin={{ left: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis type="number" tick={CHART_TICK} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={CHART_TICK_SM}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="median" radius={[0, 6, 6, 0]}>
                        {respByStaff.map((_, i) => (
                          <Cell
                            key={i}
                            fill={
                              i < 3
                                ? '#6ed1d6'
                                : i > respByStaff.length - 4
                                  ? '#ff8500'
                                  : '#6daaac'
                            }
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
                    .map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-wl-surface/50 bg-wl-page px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-wl-ink">
                            {row.name}
                          </div>
                          <div className="truncate text-xs text-wl-ink-muted">
                            {row.role} · {row.clientName}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-display tabular-nums font-semibold text-wl-teal-muted">
                            {row.median}m
                          </div>
                          <span
                            className={cn(
                              'mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                              row.priority === 'critical' &&
                                'bg-wl-orange/20 text-wl-orange',
                              row.priority === 'high' &&
                                'bg-wl-teal/25 text-wl-teal-muted',
                              row.priority === 'standard' &&
                                'bg-wl-surface/50 text-wl-ink',
                              row.priority === 'low' &&
                                'bg-wl-ink/10 text-wl-ink-muted',
                            )}
                          >
                            {row.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {nav === 'sentiment' && (
          <div className="space-y-6">
            <Card
              title="Sentiment heat map (mock NLP scores)"
              subtitle="Scores normalized −1…+1 from email threads per client. Only last 12 weeks of windows are shown, per your spec."
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
                          className="px-2 py-2 text-center text-xs font-semibold text-wl-orange"
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
                                title={`Vol: ${cell.volume} · trend: ${cell.trend}`}
                              >
                                <span className="text-sm font-semibold text-slate-950">
                                  {cell.score > 0 ? '+' : ''}
                                  {cell.score.toFixed(2)}
                                </span>
                                <span className="text-[10px] font-medium text-slate-900/80">
                                  {cell.volume} msgs
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

        {nav === 'email' && (
          <div className="space-y-6">
            <Card
              title="Send volume vs logged time (mock)"
              subtitle="Hypothesis: high logged hours but flat email sends may warrant a utilization conversation. Twelve sample weeks below."
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={last4WeeksEmail}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis dataKey="week" tick={CHART_TICK_SM} />
                      <YAxis yAxisId="left" tick={CHART_TICK} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={CHART_TICK}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="_team_sent"
                        name="Team emails sent"
                        stroke="#6ed1d6"
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
                        className="flex items-center justify-between gap-3 rounded-xl border border-wl-surface/50 bg-wl-card px-3 py-2 shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-wl-teal/20 text-xs font-bold text-wl-teal-muted">
                            {s.initials}
                          </span>
                          <div>
                            <div className="font-medium text-wl-ink">{s.name}</div>
                            <div className="text-xs text-wl-ink-muted">
                              Last 4 wks · {sent} sent · {Math.round(hrs * 10) / 10}h logged
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold uppercase tracking-wide text-wl-ink-muted">
                            Sends / hour
                          </div>
                          <div className="font-display text-lg tabular-nums font-semibold text-wl-orange">
                            {Math.round(ratio * 10) / 10}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          </div>
        )}

        {nav === 'onboarding' && (
          <div className="space-y-6">
            <Card
              title="New client onboarding — status tracker (mock)"
              subtitle="Same visual language as month-end close boards: stages, owners, and checklist completion."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {onboardingClients.map((ob) => {
                  const owner = staff.find((x) => x.id === ob.ownerStaffId)
                  return (
                    <div
                      key={ob.id}
                      className="flex flex-col rounded-2xl border border-wl-surface/50 bg-gradient-to-b from-wl-teal/5 to-wl-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-display text-base font-bold text-wl-teal">
                            {ob.clientName}
                          </h4>
                          <p className="mt-1 text-xs text-wl-ink-muted">
                            Owner: {owner?.name} · Target: {ob.targetGoLive}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-wl-orange/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-wl-orange">
                          {ob.stage}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs text-wl-ink-muted">
                          <span>Progress</span>
                          <span className="font-semibold">{ob.percentComplete}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-wl-surface/40">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-wl-teal-muted to-wl-teal"
                            style={{ width: `${ob.percentComplete}%` }}
                          />
                        </div>
                      </div>
                      <ul className="mt-4 space-y-2 text-sm text-wl-ink">
                        {ob.steps.map((step) => (
                          <li
                            key={step.label}
                            className="flex items-start gap-2"
                          >
                            <span
                              className={cn(
                                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px]',
                                step.done
                                  ? 'border-wl-teal-muted bg-wl-teal/15 text-wl-teal-muted'
                                  : 'border-wl-surface bg-wl-page text-wl-ink-muted',
                              )}
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
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-wl-orange hover:text-wl-teal-muted"
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
    </div>
  )
}

function FilterChip<T extends string>({
  icon: Icon,
  label,
  options,
  selected,
  onChange,
}: {
  icon: typeof Users
  label: string
  options: { id: T; label: string }[]
  selected: T[] | null
  onChange: (v: T[] | null) => void
}) {
  const [open, setOpen] = useState(false)
  const allIds = options.map((x) => x.id)
  const summary =
    selected === null
      ? 'All'
      : selected.length === 0
        ? 'None match'
        : selected.length <= 2
          ? options
              .filter((o) => selected.includes(o.id))
              .map((o) => o.label)
              .join(', ')
          : `${selected.length} selected`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border-2 border-wl-ink/15 bg-wl-surface/30 px-3 py-2 text-left text-xs text-wl-ink hover:bg-wl-surface/50"
      >
        <Icon className="h-3.5 w-3.5 text-wl-teal-muted" />
        <span className="font-semibold uppercase tracking-wide text-wl-ink-muted">
          {label}:
        </span>
        <span className="max-w-[140px] truncate">{summary}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-2xl border border-wl-surface/60 bg-wl-card p-2 shadow-xl">
          <div className="mb-2 flex gap-2 border-b border-wl-surface/40 pb-2">
            <button
              type="button"
              className="text-[11px] font-semibold uppercase text-wl-teal-muted hover:underline"
              onClick={() => onChange(null)}
            >
              All
            </button>
            <button
              type="button"
              className="text-[11px] font-semibold uppercase text-wl-ink-muted hover:underline"
              onClick={() => onChange([])}
            >
              None
            </button>
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {options.map((o) => {
              const checked =
                selected === null ? true : selected.includes(o.id)
              return (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center gap-2 rounded-full px-2 py-1.5 text-xs hover:bg-wl-teal/10"
                >
                  <input
                    type="checkbox"
                    className="rounded border-wl-surface text-wl-teal-muted"
                    checked={checked}
                    onChange={() => {
                      if (selected === null) {
                        onChange(allIds.filter((id) => id !== o.id))
                      } else if (selected.includes(o.id)) {
                        const next = selected.filter((id) => id !== o.id)
                        onChange(next.length === 0 ? [] : next)
                      } else {
                        const next = [...selected, o.id]
                        onChange(next.length === allIds.length ? null : next)
                      }
                    }}
                  />
                  <span className={cn(!checked && 'text-wl-ink-muted')}>
                    {o.label}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
