import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowDownAZ,
  ArrowUpDown,
  ArrowUpZA,
  Building2,
  Clock,
  Download,
  Users,
} from 'lucide-react'
import {
  clients,
  staff,
  TASK_TYPES,
  type TaskType,
} from '../data/mockDashboard'
import { Card } from '../components/Card'
import { DateRangePicker } from '../components/DateRangePicker'
import { WrappedAxisTick } from '../components/WrappedAxisTick'
import { FilterMultiSelect } from '../components/FilterMultiSelect'
import {
  CHART_GRID,
  CHART_TICK,
  CHART_TICK_SM,
  TASK_COLORS,
  TOOLTIP_STYLE,
} from '../constants/chart'
import { cn } from '../utils/cn'
import { downloadCsv } from '../utils/csv'
import { fmtExportCell, fmtFixed, fmtInt } from '../utils/format'
import { useTimesheetsData } from '../hooks/useTimesheetsData'

export type TimesheetsState = {
  filterStaff: string[] | null
  setFilterStaff: (next: string[] | null) => void
  filterClients: string[] | null
  setFilterClients: (next: string[] | null) => void
  filterTaskTypes: TaskType[] | null
  setFilterTaskTypes: (next: TaskType[] | null) => void
  openFilterId: string | null
  setOpenFilterId: (next: string | null) => void
  tsSub: 'overview' | 'by_client' | 'by_type' | 'by_staff' | 'export'
  setTsSub: (
    next: 'overview' | 'by_client' | 'by_type' | 'by_staff' | 'export',
  ) => void
  exportStaffIds: string[] | null
  setExportStaffIds: (next: string[] | null) => void
  timesheetPeriodFrom: string
  timesheetPeriodTo: string
  setTimesheetPeriod: (from: string, to: string) => void
  timesheetPeriodBaselineFrom: string
  timesheetPeriodBaselineTo: string
}

export default function TimesheetsView({
  dateFrom,
  dateTo,
  state,
}: {
  dateFrom: string
  dateTo: string
  state: TimesheetsState
}) {
  const {
    filterStaff,
    setFilterStaff,
    filterClients,
    setFilterClients,
    filterTaskTypes,
    setFilterTaskTypes,
    openFilterId,
    setOpenFilterId,
    tsSub,
    setTsSub,
    exportStaffIds,
    setExportStaffIds,
    timesheetPeriodFrom,
    timesheetPeriodTo,
    setTimesheetPeriod,
    timesheetPeriodBaselineFrom,
    timesheetPeriodBaselineTo,
  } = state

  const [byClientNameFilter, setByClientNameFilter] = useState('')
  const [byClientHoursMin, setByClientHoursMin] = useState('')
  const [byClientAllocMin, setByClientAllocMin] = useState('')
  const [byClientSort, setByClientSort] = useState<
    'client' | 'hours' | 'allocation'
  >('hours')
  const [byClientSortDir, setByClientSortDir] = useState<'asc' | 'desc'>('desc')
  const [byClientPopoverOpen, setByClientPopoverOpen] = useState<
    null | 'client' | 'hours' | 'allocation'
  >(null)
  const byClientTableHeadRef = useRef<HTMLTableSectionElement>(null)

  useEffect(() => {
    if (tsSub !== 'by_client') setByClientPopoverOpen(null)
  }, [tsSub])

  useEffect(() => {
    if (byClientPopoverOpen === null) return
    const onDoc = (e: MouseEvent) => {
      if (!byClientTableHeadRef.current?.contains(e.target as Node)) {
        setByClientPopoverOpen(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setByClientPopoverOpen(null)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [byClientPopoverOpen])

  const { filtered, byClient, byClientType, byStaff, exportData } =
    useTimesheetsData({
      dateFrom,
      dateTo,
      filterStaff,
      filterClients,
      filterTaskTypes,
      exportStaffIds,
    })

  const byClientTableRows = useMemo(() => {
    const q = byClientNameFilter.trim().toLowerCase()
    const hoursMinN = parseFloat(byClientHoursMin)
    const allocMinN = parseFloat(byClientAllocMin)

    let rows = byClient.map((r) => ({ ...r }))
    if (q) {
      rows = rows.filter((r) => r.name.toLowerCase().includes(q))
    }
    if (byClientHoursMin.trim() !== '' && !Number.isNaN(hoursMinN)) {
      rows = rows.filter((r) => r.hours >= hoursMinN)
    }

    const subsetTotal = rows.reduce((a, x) => a + x.hours, 0)
    const withAlloc = rows.map((r) => ({
      ...r,
      allocation: subsetTotal
        ? Math.round((r.hours / subsetTotal) * 1000) / 10
        : 0,
    }))

    let filteredAlloc = withAlloc
    if (byClientAllocMin.trim() !== '' && !Number.isNaN(allocMinN)) {
      filteredAlloc = withAlloc.filter((r) => r.allocation >= allocMinN)
    }

    const dir = byClientSortDir === 'asc' ? 1 : -1
    const sorted = [...filteredAlloc].sort((a, b) => {
      if (byClientSort === 'client') {
        return dir * a.name.localeCompare(b.name)
      }
      if (byClientSort === 'hours') {
        return dir * (a.hours - b.hours)
      }
      return dir * (a.allocation - b.allocation)
    })

    return sorted
  }, [
    byClient,
    byClientNameFilter,
    byClientHoursMin,
    byClientAllocMin,
    byClientSort,
    byClientSortDir,
  ])

  const toggleByClientPopover = (
    col: 'client' | 'hours' | 'allocation',
  ) => {
    setByClientPopoverOpen((v) => (v === col ? null : col))
  }

  const cycleByClientSort = (
    col: 'client' | 'hours' | 'allocation',
  ) => {
    if (byClientSort !== col) {
      setByClientSort(col)
      setByClientSortDir(
        col === 'client' ? 'asc' : 'desc',
      )
    } else {
      setByClientSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    }
  }

  const SortAffordance = ({
    col,
  }: {
    col: 'client' | 'hours' | 'allocation'
  }) => {
    const active = byClientSort === col
    if (!active) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden />
    }
    return byClientSortDir === 'asc' ? (
      <ArrowDownAZ className="h-3.5 w-3.5 text-wl-teal" aria-hidden />
    ) : (
      <ArrowUpZA className="h-3.5 w-3.5 text-wl-teal" aria-hidden />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <div className="flex w-full min-w-0 flex-col flex-wrap gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <DateRangePicker
            from={timesheetPeriodFrom}
            to={timesheetPeriodTo}
            onChange={setTimesheetPeriod}
            baselineFrom={timesheetPeriodBaselineFrom}
            baselineTo={timesheetPeriodBaselineTo}
            compact
            className="w-full min-w-0 sm:w-auto"
          />
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
            buttonClassName="h-10 min-h-10 shrink-0 py-0 text-sm"
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
            buttonClassName="h-10 min-h-10 shrink-0 py-0 text-sm"
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
            buttonClassName="h-10 min-h-10 shrink-0 py-0 text-sm"
          />
        </div>
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
          <Card title="Total hours">
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
            <div
              className="min-h-80 w-full"
              style={{
                height: Math.max(320, 40 + byClient.length * 40),
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={byClient}
                  margin={{ left: 4, right: 28, top: 8, bottom: 8 }}
                  barCategoryGap="22%"
                  maxBarSize={34}
                >
                  <defs>
                    <linearGradient
                      id="timesheetOverviewHoursBar"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#0891b2" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.92} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 6"
                    stroke={CHART_GRID}
                    strokeOpacity={0.85}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={CHART_TICK}
                    tickFormatter={(v) => fmtFixed(Number(v), 0)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={158}
                    tick={CHART_TICK_SM}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => fmtFixed(Number(value), 1)}
                    labelFormatter={(name) => String(name)}
                  />
                  <Bar
                    dataKey="hours"
                    fill="url(#timesheetOverviewHoursBar)"
                    radius={[0, 10, 10, 0]}
                  >
                    <LabelList
                      dataKey="hours"
                      position="right"
                      offset={10}
                      formatter={(v) =>
                        v == null || v === ''
                          ? ''
                          : fmtFixed(Number(v), 1)
                      }
                      style={{
                        fill: '#64748b',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {tsSub === 'by_client' && (
        <Card title="Hours by client">
          <div className="rounded-xl border border-wl-surface">
            <table className="w-full table-fixed bg-wl-card text-left text-sm">
              <colgroup>
                <col className="w-[42%]" />
                <col className="w-[20%]" />
                <col className="w-[38%]" />
              </colgroup>
              <thead
                ref={byClientTableHeadRef}
                className="border-b border-wl-surface text-xs font-semibold uppercase tracking-wide text-wl-ink-muted"
              >
                <tr>
                  <th className="relative px-0 py-3 pr-4 align-middle">
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => toggleByClientPopover('client')}
                        className={cn(
                          'rounded px-0.5 py-0.5 text-left font-semibold tracking-wide transition',
                          byClientPopoverOpen === 'client' ||
                            byClientNameFilter.trim() !== ''
                            ? 'text-wl-teal'
                            : 'text-wl-ink-muted hover:text-wl-ink',
                        )}
                      >
                        Client
                      </button>
                      <button
                        type="button"
                        onClick={() => cycleByClientSort('client')}
                        className="-ml-0.5 shrink-0 rounded p-0.5 text-wl-ink-muted transition hover:bg-wl-surface hover:text-wl-ink"
                        aria-label="Sort by client name"
                      >
                        <SortAffordance col="client" />
                      </button>
                    </div>
                    {byClientPopoverOpen === 'client' && (
                      <div
                        className="absolute left-0 top-full z-30 mt-1.5 min-w-[13rem] max-w-[min(100vw-2rem,16rem)] rounded-xl border border-wl-surface bg-wl-card p-3 shadow-lg shadow-slate-900/10"
                        role="dialog"
                        aria-label="Filter by client name"
                      >
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-wl-ink-muted">
                          Name contains
                        </label>
                        <input
                          type="search"
                          value={byClientNameFilter}
                          onChange={(e) =>
                            setByClientNameFilter(e.target.value)
                          }
                          placeholder="Contains…"
                          autoFocus
                          className="w-full rounded-lg border border-wl-surface bg-wl-page px-2.5 py-2 text-sm font-normal normal-case tracking-normal text-wl-ink placeholder:text-wl-ink-muted focus:border-wl-teal/40 focus:outline-none focus:ring-2 focus:ring-wl-teal/20"
                        />
                      </div>
                    )}
                  </th>
                  <th className="relative px-0 py-3 pr-4 align-middle">
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => toggleByClientPopover('hours')}
                        className={cn(
                          'rounded px-0.5 py-0.5 text-left font-semibold tracking-wide transition',
                          byClientPopoverOpen === 'hours' ||
                            byClientHoursMin.trim() !== ''
                            ? 'text-wl-teal'
                            : 'text-wl-ink-muted hover:text-wl-ink',
                        )}
                      >
                        Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => cycleByClientSort('hours')}
                        className="-ml-0.5 shrink-0 rounded p-0.5 text-wl-ink-muted transition hover:bg-wl-surface hover:text-wl-ink"
                        aria-label="Sort by hours"
                      >
                        <SortAffordance col="hours" />
                      </button>
                    </div>
                    {byClientPopoverOpen === 'hours' && (
                      <div
                        className="absolute right-0 top-full z-30 mt-1.5 w-48 rounded-xl border border-wl-surface bg-wl-card p-3 shadow-lg shadow-slate-900/10 sm:left-0"
                        role="dialog"
                        aria-label="Filter by minimum hours"
                      >
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-wl-ink-muted">
                          Minimum hours
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={byClientHoursMin}
                          onChange={(e) =>
                            setByClientHoursMin(e.target.value)
                          }
                          placeholder="Min hours"
                          autoFocus
                          className="w-full rounded-lg border border-wl-surface bg-wl-page px-2.5 py-2 text-sm font-normal normal-case tracking-normal tabular-nums text-wl-ink placeholder:text-wl-ink-muted focus:border-wl-teal/40 focus:outline-none focus:ring-2 focus:ring-wl-teal/20"
                        />
                      </div>
                    )}
                  </th>
                  <th className="relative px-0 py-3 align-middle">
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => toggleByClientPopover('allocation')}
                        className={cn(
                          'rounded px-0.5 py-0.5 text-left font-semibold tracking-wide transition',
                          byClientPopoverOpen === 'allocation' ||
                            byClientAllocMin.trim() !== ''
                            ? 'text-wl-teal'
                            : 'text-wl-ink-muted hover:text-wl-ink',
                        )}
                      >
                        Allocation
                      </button>
                      <button
                        type="button"
                        onClick={() => cycleByClientSort('allocation')}
                        className="-ml-0.5 shrink-0 rounded p-0.5 text-wl-ink-muted transition hover:bg-wl-surface hover:text-wl-ink"
                        aria-label="Sort by allocation"
                      >
                        <SortAffordance col="allocation" />
                      </button>
                    </div>
                    {byClientPopoverOpen === 'allocation' && (
                      <div
                        className="absolute right-0 top-full z-30 mt-1.5 w-48 rounded-xl border border-wl-surface bg-wl-card p-3 shadow-lg shadow-slate-900/10"
                        role="dialog"
                        aria-label="Filter by minimum allocation"
                      >
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-wl-ink-muted">
                          Minimum allocation %
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={byClientAllocMin}
                          onChange={(e) =>
                            setByClientAllocMin(e.target.value)
                          }
                          placeholder="Min %"
                          autoFocus
                          className="w-full rounded-lg border border-wl-surface bg-wl-page px-2.5 py-2 text-sm font-normal normal-case tracking-normal tabular-nums text-wl-ink placeholder:text-wl-ink-muted focus:border-wl-teal/40 focus:outline-none focus:ring-2 focus:ring-wl-teal/20"
                        />
                      </div>
                    )}
                  </th>
                </tr>
              </thead>
            </table>
            <div className="max-h-[min(28rem,55vh)] overflow-x-auto overflow-y-auto bg-wl-card">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[42%]" />
                  <col className="w-[20%]" />
                  <col className="w-[38%]" />
                </colgroup>
                <tbody>
                  {byClientTableRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-8 text-center text-sm text-wl-ink-muted"
                      >
                        No rows match these filters.
                      </td>
                    </tr>
                  ) : (
                    byClientTableRows.map((r) => (
                      <tr
                        key={r.name}
                        className="border-t border-wl-surface text-wl-ink"
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
                                style={{
                                  width: `${Math.min(100, r.allocation)}%`,
                                }}
                              />
                            </div>
                            <span className="w-10 shrink-0 text-right text-xs text-wl-ink-muted">
                              {fmtFixed(r.allocation, 1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
  )
}
