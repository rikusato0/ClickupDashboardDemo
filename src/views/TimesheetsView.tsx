import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  Clock,
  Download,
  Users,
} from 'lucide-react'
import {
  TASK_TYPES,
  type TaskType,
} from '../data/mockDashboard'
import { useDashboard } from '../context/DashboardContext'
import { Card } from '../components/Card'
import { DateRangePicker } from '../components/DateRangePicker'
import { WrappedAxisTick } from '../components/WrappedAxisTick'
import { ClientPicker } from '../components/ClientPicker'
import { FilterMultiSelect } from '../components/FilterMultiSelect'
import {
  CHART_GRID,
  CHART_TICK,
  TASK_COLORS,
  TOOLTIP_STYLE,
} from '../constants/chart'
import { cn } from '../utils/cn'
import { downloadCsv } from '../utils/csv'
import { fmtExportCell, fmtFixed, fmtInt } from '../utils/format'
import { useTimesheetsData } from '../hooks/useTimesheetsData'

/** Near full-viewport scroll region for timesheet tables. */
const TIMESHEET_TABLE_SCROLL_CLASS =
  'h-[calc(80dvh-11rem)] min-h-[24rem] overflow-auto'

/** Bar color: light green (low hours) → deep green (high hours), within current data range. */
function hoursToBarColor(hours: number, minH: number, maxH: number) {
  if (maxH <= minH) return 'rgb(5, 122, 85)'
  const t = Math.min(1, Math.max(0, (hours - minH) / (maxH - minH)))
  const r0 = 220
  const g0 = 252
  const b0 = 231
  const r1 = 5
  const g1 = 122
  const b1 = 85
  const r = Math.round(r0 + (r1 - r0) * t)
  const g = Math.round(g0 + (g1 - g0) * t)
  const b = Math.round(b0 + (b1 - b0) * t)
  return `rgb(${r},${g},${b})`
}

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
  const { snapshot } = useDashboard()
  const clients = snapshot?.clients ?? []
  const staff = snapshot?.staff ?? []
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

  const [byTypeNameFilter, setByTypeNameFilter] = useState('')
  const [byTypeTotalMin, setByTypeTotalMin] = useState('')
  const [byTypeTaskMin, setByTypeTaskMin] = useState<Record<TaskType, string>>(
    () =>
      Object.fromEntries(TASK_TYPES.map((t) => [t, ''])) as Record<
        TaskType,
        string
      >,
  )
  const [byTypeSort, setByTypeSort] = useState<
    'client' | 'total' | TaskType
  >('total')
  const [byTypeSortDir, setByTypeSortDir] = useState<'asc' | 'desc'>('desc')
  const [byTypePopoverOpen, setByTypePopoverOpen] = useState<
    null | 'client' | 'total' | TaskType
  >(null)
  const byTypeTableHeadRef = useRef<HTMLTableSectionElement>(null)

  const [byStaffNameFilter, setByStaffNameFilter] = useState('')
  const [byStaffHoursMin, setByStaffHoursMin] = useState('')
  const [byStaffEntriesMin, setByStaffEntriesMin] = useState('')
  const [byStaffAvgMin, setByStaffAvgMin] = useState('')
  const [byStaffSort, setByStaffSort] = useState<
    'staff' | 'hours' | 'entries' | 'avg'
  >('hours')
  const [byStaffSortDir, setByStaffSortDir] = useState<'asc' | 'desc'>('desc')
  const [byStaffPopoverOpen, setByStaffPopoverOpen] = useState<
    null | 'staff' | 'hours' | 'entries' | 'avg'
  >(null)
  const byStaffTableHeadRef = useRef<HTMLTableSectionElement>(null)

  useEffect(() => {
    if (tsSub !== 'by_client') setByClientPopoverOpen(null)
  }, [tsSub])

  useEffect(() => {
    if (tsSub !== 'by_type') setByTypePopoverOpen(null)
  }, [tsSub])

  useEffect(() => {
    if (tsSub !== 'by_staff') setByStaffPopoverOpen(null)
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

  useEffect(() => {
    if (byTypePopoverOpen === null) return
    const onDoc = (e: MouseEvent) => {
      if (!byTypeTableHeadRef.current?.contains(e.target as Node)) {
        setByTypePopoverOpen(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setByTypePopoverOpen(null)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [byTypePopoverOpen])

  useEffect(() => {
    if (byStaffPopoverOpen === null) return
    const onDoc = (e: MouseEvent) => {
      if (!byStaffTableHeadRef.current?.contains(e.target as Node)) {
        setByStaffPopoverOpen(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setByStaffPopoverOpen(null)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [byStaffPopoverOpen])

  const { filtered, byClient, byClientType, byStaff, exportData } =
    useTimesheetsData({
      dateFrom,
      dateTo,
      filterStaff,
      filterClients,
      filterTaskTypes,
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

  const byTypeTableRows = useMemo(() => {
    const q = byTypeNameFilter.trim().toLowerCase()
    const totalMinN = parseFloat(byTypeTotalMin)
    let rows = byClientType.map((r) => ({ ...r }))
    if (q) {
      rows = rows.filter((r) =>
        String(r.client).toLowerCase().includes(q),
      )
    }
    if (byTypeTotalMin.trim() !== '' && !Number.isNaN(totalMinN)) {
      rows = rows.filter((r) => (r.total as number) >= totalMinN)
    }
    for (const t of TASK_TYPES) {
      const raw = byTypeTaskMin[t]?.trim() ?? ''
      if (raw === '') continue
      const n = parseFloat(raw)
      if (Number.isNaN(n)) continue
      rows = rows.filter((r) => (r[t] as number) >= n)
    }

    const dir = byTypeSortDir === 'asc' ? 1 : -1
    const sorted = [...rows].sort((a, b) => {
      if (byTypeSort === 'client') {
        return dir * String(a.client).localeCompare(String(b.client))
      }
      if (byTypeSort === 'total') {
        return dir * ((a.total as number) - (b.total as number))
      }
      const t = byTypeSort
      return dir * ((a[t] as number) - (b[t] as number))
    })
    return sorted
  }, [
    byClientType,
    byTypeNameFilter,
    byTypeTotalMin,
    byTypeTaskMin,
    byTypeSort,
    byTypeSortDir,
  ])

  type StaffRow = (typeof byStaff)[number] & { avg: number }
  const byStaffTableRows = useMemo(() => {
    const q = byStaffNameFilter.trim().toLowerCase()
    const hoursMinN = parseFloat(byStaffHoursMin)
    const entriesMinN = parseFloat(byStaffEntriesMin)
    const avgMinN = parseFloat(byStaffAvgMin)

    let rows: StaffRow[] = byStaff.map((r) => ({
      ...r,
      avg: r.entries ? r.hours / r.entries : 0,
    }))
    if (q) {
      rows = rows.filter((r) => r.name.toLowerCase().includes(q))
    }
    if (byStaffHoursMin.trim() !== '' && !Number.isNaN(hoursMinN)) {
      rows = rows.filter((r) => r.hours >= hoursMinN)
    }
    if (byStaffEntriesMin.trim() !== '' && !Number.isNaN(entriesMinN)) {
      rows = rows.filter((r) => r.entries >= entriesMinN)
    }
    if (byStaffAvgMin.trim() !== '' && !Number.isNaN(avgMinN)) {
      rows = rows.filter((r) => r.entries > 0 && r.avg >= avgMinN)
    }

    const dir = byStaffSortDir === 'asc' ? 1 : -1
    const sorted = [...rows].sort((a, b) => {
      if (byStaffSort === 'staff') {
        return dir * a.name.localeCompare(b.name)
      }
      if (byStaffSort === 'hours') {
        return dir * (a.hours - b.hours)
      }
      if (byStaffSort === 'entries') {
        return dir * (a.entries - b.entries)
      }
      return dir * (a.avg - b.avg)
    })
    return sorted
  }, [
    byStaff,
    byStaffNameFilter,
    byStaffHoursMin,
    byStaffEntriesMin,
    byStaffAvgMin,
    byStaffSort,
    byStaffSortDir,
  ])

  const hourRange = useMemo(() => {
    if (byClient.length === 0) return { min: 0, max: 1 }
    const hs = byClient.map((c) => c.hours)
    return { min: Math.min(...hs), max: Math.max(...hs) }
  }, [byClient])

  const toggleByClientPopover = (
    col: 'client' | 'hours' | 'allocation',
  ) => {
    setByClientPopoverOpen((v) => (v === col ? null : col))
  }

  const toggleByTypePopover = (col: 'client' | 'total' | TaskType) => {
    setByTypePopoverOpen((v) => (v === col ? null : col))
  }

  const toggleByStaffPopover = (
    col: 'staff' | 'hours' | 'entries' | 'avg',
  ) => {
    setByStaffPopoverOpen((v) => (v === col ? null : col))
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

  const cycleByTypeSort = (col: 'client' | 'total' | TaskType) => {
    if (byTypeSort !== col) {
      setByTypeSort(col)
      setByTypeSortDir(col === 'client' ? 'asc' : 'desc')
    } else {
      setByTypeSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    }
  }

  const cycleByStaffSort = (col: 'staff' | 'hours' | 'entries' | 'avg') => {
    if (byStaffSort !== col) {
      setByStaffSort(col)
      setByStaffSortDir(col === 'staff' ? 'asc' : 'desc')
    } else {
      setByStaffSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    }
  }

  const SortIcon = ({
    active,
    dir,
  }: {
    active: boolean
    dir: 'asc' | 'desc'
  }) => {
    if (!active) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden />
    }
    return dir === 'asc' ? (
      <ArrowDownAZ className="h-3.5 w-3.5 text-wl-teal" aria-hidden />
    ) : (
      <ArrowUpZA className="h-3.5 w-3.5 text-wl-teal" aria-hidden />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap gap-2">
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
          <ClientPicker
            mode="multi"
            clients={clients}
            menuId="clients"
            isOpen={openFilterId === 'clients'}
            onOpenChange={(open) =>
              setOpenFilterId(open ? 'clients' : null)
            }
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
              className="h-[min(58dvh,40rem)] w-full min-h-[20rem] overflow-x-auto rounded-lg border border-wl-surface/70 bg-gradient-to-b from-wl-card to-wl-page/50"
            >
              <div
                className="h-full min-h-[18rem] px-2 py-2 sm:px-3"
                style={{
                  minWidth: Math.max(320, byClient.length * 52),
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byClient}
                    margin={{ left: 4, right: 12, top: 28, bottom: 64 }}
                    barCategoryGap="18%"
                    maxBarSize={52}
                  >
                    <CartesianGrid
                      strokeDasharray="3 6"
                      stroke={CHART_GRID}
                      strokeOpacity={0.55}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={
                        <WrappedAxisTick fontSize={11} maxCharsPerLine={12} />
                      }
                      interval={0}
                      height={76}
                      tickMargin={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={CHART_TICK}
                      tickFormatter={(v) => fmtFixed(Number(v), 0)}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value) => [
                        fmtFixed(Number(value), 1),
                        'Hours',
                      ]}
                      labelFormatter={(name) => String(name)}
                    />
                    <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                      {byClient.map((row) => (
                        <Cell
                          key={row.name}
                          fill={hoursToBarColor(
                            row.hours,
                            hourRange.min,
                            hourRange.max,
                          )}
                        />
                      ))}
                      <LabelList
                        dataKey="hours"
                        position="top"
                        offset={8}
                        formatter={(v) =>
                          v == null || v === ''
                            ? ''
                            : fmtFixed(Number(v), 1)
                        }
                        style={{
                          fill: '#475569',
                          fontSize: 11,
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tsSub === 'by_client' && (
        <Card title="Hours by client">
          <div className={TIMESHEET_TABLE_SCROLL_CLASS}>
            <table className="w-full table-fixed bg-wl-card text-left text-sm">
              <colgroup>
                <col className="w-[42%]" />
                <col className="w-[20%]" />
                <col className="w-[38%]" />
              </colgroup>
              <thead
                ref={byClientTableHeadRef}
                className="sticky top-0 z-20 border-b border-wl-surface bg-wl-card text-xs font-semibold uppercase tracking-wide text-wl-ink-muted"
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
                        <SortIcon
                          active={byClientSort === 'client'}
                          dir={byClientSortDir}
                        />
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
                        <SortIcon
                          active={byClientSort === 'hours'}
                          dir={byClientSortDir}
                        />
                      </button>
                    </div>
                    {byClientPopoverOpen === 'hours' && (
                      <div
                        className="absolute left-0 top-full z-30 mt-1.5 w-48 rounded-xl border border-wl-surface bg-wl-card p-3 shadow-lg shadow-slate-900/10"
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
                        <SortIcon
                          active={byClientSort === 'allocation'}
                          dir={byClientSortDir}
                        />
                      </button>
                    </div>
                    {byClientPopoverOpen === 'allocation' && (
                      <div
                        className="absolute left-0 top-full z-30 mt-1.5 w-48 rounded-xl border border-wl-surface bg-wl-card p-3 shadow-lg shadow-slate-900/10"
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
                      className="border-b border-wl-surface text-wl-ink last:border-b-0"
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
            <div className={`${TIMESHEET_TABLE_SCROLL_CLASS} text-xs`}>
              <table className="w-full text-left">
                <thead
                  ref={byTypeTableHeadRef}
                  className="sticky top-0 z-20 border-b border-wl-surface bg-wl-page text-[10px] font-semibold uppercase tracking-wide text-wl-ink-muted"
                >
                  <tr>
                    <th className="relative py-2 pr-2 align-middle normal-case">
                      <div className="inline-flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => toggleByTypePopover('client')}
                          className={cn(
                            'rounded px-0.5 py-0.5 text-left font-semibold uppercase tracking-wide transition',
                            byTypePopoverOpen === 'client' ||
                              byTypeNameFilter.trim() !== ''
                              ? 'text-wl-teal'
                              : 'text-wl-ink-muted hover:text-wl-ink',
                          )}
                        >
                          Client
                        </button>
                        <button
                          type="button"
                          onClick={() => cycleByTypeSort('client')}
                          className="-ml-0.5 shrink-0 rounded p-0.5 text-wl-ink-muted transition hover:bg-wl-surface hover:text-wl-ink"
                          aria-label="Sort by client"
                        >
                          <SortIcon
                            active={byTypeSort === 'client'}
                            dir={byTypeSortDir}
                          />
                        </button>
                      </div>
                      {byTypePopoverOpen === 'client' && (
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
                            value={byTypeNameFilter}
                            onChange={(e) =>
                              setByTypeNameFilter(e.target.value)
                            }
                            placeholder="Contains…"
                            autoFocus
                            className="w-full rounded-lg border border-wl-surface bg-wl-page px-2.5 py-2 text-sm font-normal normal-case tracking-normal text-wl-ink placeholder:text-wl-ink-muted focus:border-wl-teal/40 focus:outline-none focus:ring-2 focus:ring-wl-teal/20"
                          />
                        </div>
                      )}
                    </th>
                    {TASK_TYPES.map((t) => (
                      <th
                        key={t}
                        className="relative px-0.5 py-2 align-middle"
                      >
                        <div className="inline-flex max-w-[4.5rem] flex-col items-start gap-0.5 sm:max-w-none sm:flex-row sm:items-center">
                          <button
                            type="button"
                            onClick={() => toggleByTypePopover(t)}
                            className={cn(
                              'rounded px-0.5 py-0.5 text-left leading-tight transition',
                              byTypePopoverOpen === t ||
                                (byTypeTaskMin[t]?.trim() ?? '') !== ''
                                ? 'text-wl-teal'
                                : 'text-wl-ink-muted hover:text-wl-ink',
                            )}
                          >
                            {t}
                          </button>
                          <button
                            type="button"
                            onClick={() => cycleByTypeSort(t)}
                            className="shrink-0 rounded p-0.5 text-wl-ink-muted transition hover:bg-wl-surface hover:text-wl-ink"
                            aria-label={`Sort by ${t}`}
                          >
                            <SortIcon
                              active={byTypeSort === t}
                              dir={byTypeSortDir}
                            />
                          </button>
                        </div>
                        {byTypePopoverOpen === t && (
                          <div
                            className="absolute left-0 top-full z-30 mt-1.5 w-44 rounded-xl border border-wl-surface bg-wl-card p-3 shadow-lg shadow-slate-900/10"
                            role="dialog"
                            aria-label={`Minimum ${t} hours`}
                          >
                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-wl-ink-muted">
                              Min {t} (h)
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={byTypeTaskMin[t] ?? ''}
                              onChange={(e) =>
                                setByTypeTaskMin((m) => ({
                                  ...m,
                                  [t]: e.target.value,
                                }))
                              }
                              placeholder="Min"
                              autoFocus
                              className="w-full rounded-lg border border-wl-surface bg-wl-page px-2.5 py-2 text-sm font-normal normal-case tracking-normal tabular-nums text-wl-ink placeholder:text-wl-ink-muted focus:border-wl-teal/40 focus:outline-none focus:ring-2 focus:ring-wl-teal/20"
                            />
                          </div>
                        )}
                      </th>
                    ))}
                    <th className="relative py-2 pl-1 align-middle">
                      <div className="inline-flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => toggleByTypePopover('total')}
                          className={cn(
                            'rounded px-0.5 py-0.5 text-left transition',
                            byTypePopoverOpen === 'total' ||
                              byTypeTotalMin.trim() !== ''
                              ? 'text-wl-teal'
                              : 'text-wl-ink-muted hover:text-wl-ink',
                          )}
                        >
                          Σ
                        </button>
                        <button
                          type="button"
                          onClick={() => cycleByTypeSort('total')}
                          className="-ml-0.5 shrink-0 rounded p-0.5 text-wl-ink-muted transition hover:bg-wl-surface hover:text-wl-ink"
                          aria-label="Sort by total"
                        >
                          <SortIcon
                            active={byTypeSort === 'total'}
                            dir={byTypeSortDir}
                          />
                        </button>
                      </div>
                      {byTypePopoverOpen === 'total' && (
                        <div
                          className="absolute right-0 left-auto top-full z-30 mt-1.5 w-44 rounded-xl border border-wl-surface bg-wl-card p-3 shadow-lg shadow-slate-900/10"
                          role="dialog"
                          aria-label="Minimum total hours"
                        >
                          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-wl-ink-muted">
                            Minimum Σ (h)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={byTypeTotalMin}
                            onChange={(e) =>
                              setByTypeTotalMin(e.target.value)
                            }
                            placeholder="Min total"
                            autoFocus
                            className="w-full rounded-lg border border-wl-surface bg-wl-page px-2.5 py-2 text-sm font-normal normal-case tracking-normal tabular-nums text-wl-ink placeholder:text-wl-ink-muted focus:border-wl-teal/40 focus:outline-none focus:ring-2 focus:ring-wl-teal/20"
                          />
                        </div>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byTypeTableRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={TASK_TYPES.length + 2}
                        className="py-8 text-center text-sm text-wl-ink-muted"
                      >
                        No rows match these filters.
                      </td>
                    </tr>
                  ) : (
                    byTypeTableRows.map((row) => (
                      <tr
                        key={String(row.client)}
                        className="border-b border-wl-surface text-wl-ink last:border-b-0"
                      >
                        <td className="py-2 pr-2 font-medium text-wl-ink">
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tsSub === 'by_staff' && (
        <Card title="Staff summary">
          <div className={TIMESHEET_TABLE_SCROLL_CLASS}>
            <table className="w-full text-left text-sm">
              <thead
                ref={byStaffTableHeadRef}
                className="sticky top-0 z-20 border-b border-wl-surface bg-wl-card text-xs font-semibold uppercase tracking-wide text-wl-ink-muted"
              >
                <tr>
                  <th className="relative py-3 pr-4 align-middle">
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => toggleByStaffPopover('staff')}
                        className={cn(
                          'rounded px-0.5 py-0.5 text-left font-semibold tracking-wide transition',
                          byStaffPopoverOpen === 'staff' ||
                            byStaffNameFilter.trim() !== ''
                            ? 'text-wl-teal'
                            : 'text-wl-ink-muted hover:text-wl-ink',
                        )}
                      >
                        Staff
                      </button>
                      <button
                        type="button"
                        onClick={() => cycleByStaffSort('staff')}
                        className="-ml-0.5 shrink-0 rounded p-0.5 text-wl-ink-muted transition hover:bg-wl-surface hover:text-wl-ink"
                        aria-label="Sort by staff"
                      >
                        <SortIcon
                          active={byStaffSort === 'staff'}
                          dir={byStaffSortDir}
                        />
                      </button>
                    </div>
                    {byStaffPopoverOpen === 'staff' && (
                      <div
                        className="absolute left-0 top-full z-30 mt-1.5 min-w-[13rem] max-w-[min(100vw-2rem,16rem)] rounded-xl border border-wl-surface bg-wl-card p-3 shadow-lg shadow-slate-900/10"
                        role="dialog"
                        aria-label="Filter by staff name"
                      >
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-wl-ink-muted">
                          Name contains
                        </label>
                        <input
                          type="search"
                          value={byStaffNameFilter}
                          onChange={(e) =>
                            setByStaffNameFilter(e.target.value)
                          }
                          placeholder="Contains…"
                          autoFocus
                          className="w-full rounded-lg border border-wl-surface bg-wl-page px-2.5 py-2 text-sm font-normal normal-case tracking-normal text-wl-ink placeholder:text-wl-ink-muted focus:border-wl-teal/40 focus:outline-none focus:ring-2 focus:ring-wl-teal/20"
                        />
                      </div>
                    )}
                  </th>
                  <th className="relative py-3 pr-4 align-middle">
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => toggleByStaffPopover('hours')}
                        className={cn(
                          'rounded px-0.5 py-0.5 text-left font-semibold tracking-wide transition',
                          byStaffPopoverOpen === 'hours' ||
                            byStaffHoursMin.trim() !== ''
                            ? 'text-wl-teal'
                            : 'text-wl-ink-muted hover:text-wl-ink',
                        )}
                      >
                        Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => cycleByStaffSort('hours')}
                        className="-ml-0.5 shrink-0 rounded p-0.5 text-wl-ink-muted transition hover:bg-wl-surface hover:text-wl-ink"
                        aria-label="Sort by hours"
                      >
                        <SortIcon
                          active={byStaffSort === 'hours'}
                          dir={byStaffSortDir}
                        />
                      </button>
                    </div>
                    {byStaffPopoverOpen === 'hours' && (
                      <div
                        className="absolute left-0 top-full z-30 mt-1.5 w-48 rounded-xl border border-wl-surface bg-wl-card p-3 shadow-lg shadow-slate-900/10"
                        role="dialog"
                        aria-label="Minimum hours"
                      >
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-wl-ink-muted">
                          Minimum hours
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={byStaffHoursMin}
                          onChange={(e) =>
                            setByStaffHoursMin(e.target.value)
                          }
                          placeholder="Min"
                          autoFocus
                          className="w-full rounded-lg border border-wl-surface bg-wl-page px-2.5 py-2 text-sm font-normal normal-case tracking-normal tabular-nums text-wl-ink placeholder:text-wl-ink-muted focus:border-wl-teal/40 focus:outline-none focus:ring-2 focus:ring-wl-teal/20"
                        />
                      </div>
                    )}
                  </th>
                  <th className="relative py-3 pr-4 align-middle">
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => toggleByStaffPopover('entries')}
                        className={cn(
                          'rounded px-0.5 py-0.5 text-left font-semibold tracking-wide transition',
                          byStaffPopoverOpen === 'entries' ||
                            byStaffEntriesMin.trim() !== ''
                            ? 'text-wl-teal'
                            : 'text-wl-ink-muted hover:text-wl-ink',
                        )}
                      >
                        Entries
                      </button>
                      <button
                        type="button"
                        onClick={() => cycleByStaffSort('entries')}
                        className="-ml-0.5 shrink-0 rounded p-0.5 text-wl-ink-muted transition hover:bg-wl-surface hover:text-wl-ink"
                        aria-label="Sort by entries"
                      >
                        <SortIcon
                          active={byStaffSort === 'entries'}
                          dir={byStaffSortDir}
                        />
                      </button>
                    </div>
                    {byStaffPopoverOpen === 'entries' && (
                      <div
                        className="absolute left-0 top-full z-30 mt-1.5 w-48 rounded-xl border border-wl-surface bg-wl-card p-3 shadow-lg shadow-slate-900/10"
                        role="dialog"
                        aria-label="Minimum entries"
                      >
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-wl-ink-muted">
                          Minimum entries
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={byStaffEntriesMin}
                          onChange={(e) =>
                            setByStaffEntriesMin(e.target.value)
                          }
                          placeholder="Min"
                          autoFocus
                          className="w-full rounded-lg border border-wl-surface bg-wl-page px-2.5 py-2 text-sm font-normal normal-case tracking-normal tabular-nums text-wl-ink placeholder:text-wl-ink-muted focus:border-wl-teal/40 focus:outline-none focus:ring-2 focus:ring-wl-teal/20"
                        />
                      </div>
                    )}
                  </th>
                  <th className="relative py-3 align-middle">
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => toggleByStaffPopover('avg')}
                        className={cn(
                          'rounded px-0.5 py-0.5 text-left font-semibold tracking-wide transition',
                          byStaffPopoverOpen === 'avg' ||
                            byStaffAvgMin.trim() !== ''
                            ? 'text-wl-teal'
                            : 'text-wl-ink-muted hover:text-wl-ink',
                        )}
                      >
                        Avg / entry
                      </button>
                      <button
                        type="button"
                        onClick={() => cycleByStaffSort('avg')}
                        className="-ml-0.5 shrink-0 rounded p-0.5 text-wl-ink-muted transition hover:bg-wl-surface hover:text-wl-ink"
                        aria-label="Sort by average hours per entry"
                      >
                        <SortIcon
                          active={byStaffSort === 'avg'}
                          dir={byStaffSortDir}
                        />
                      </button>
                    </div>
                    {byStaffPopoverOpen === 'avg' && (
                      <div
                        className="absolute left-0 top-full z-30 mt-1.5 w-48 rounded-xl border border-wl-surface bg-wl-card p-3 shadow-lg shadow-slate-900/10"
                        role="dialog"
                        aria-label="Minimum average hours"
                      >
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-wl-ink-muted">
                          Minimum avg (h)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={byStaffAvgMin}
                          onChange={(e) =>
                            setByStaffAvgMin(e.target.value)
                          }
                          placeholder="Min"
                          autoFocus
                          className="w-full rounded-lg border border-wl-surface bg-wl-page px-2.5 py-2 text-sm font-normal normal-case tracking-normal tabular-nums text-wl-ink placeholder:text-wl-ink-muted focus:border-wl-teal/40 focus:outline-none focus:ring-2 focus:ring-wl-teal/20"
                        />
                      </div>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {byStaffTableRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-sm text-wl-ink-muted"
                    >
                      No rows match these filters.
                    </td>
                  </tr>
                ) : (
                  byStaffTableRows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-wl-surface text-wl-ink last:border-b-0"
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tsSub === 'export' && (
        <Card
          title="Daily export"
          subtitle="Per-staff weekday hours and period total. Use the Staff filter in the toolbar to limit who appears here, then export."
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
          <p className="mb-3 text-[11px] text-wl-ink-muted">
            {exportData.rows.length === 0
              ? filterStaff !== null && filterStaff.length === 0
                ? 'Staff filter is set to none. Choose one or more people in the toolbar above.'
                : 'Select at least one staff member to see daily hours.'
              : `${fmtInt(exportData.rows.length)} staff in export${filterStaff === null ? ' (all)' : ''}`}
          </p>
          <div className={`${TIMESHEET_TABLE_SCROLL_CLASS} overflow-x-auto`}>
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
