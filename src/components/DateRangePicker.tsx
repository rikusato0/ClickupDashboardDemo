import { useEffect, useRef, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns'
import {
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

type Props = {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  /** Used by “Clear” to restore the default reporting window */
  baselineFrom: string
  baselineTo: string
  className?: string
  /** Single-line trigger aligned with toolbar filter height */
  compact?: boolean
}

type RangeField = 'from' | 'to'

export function DateRangePicker({
  from,
  to,
  onChange,
  baselineFrom,
  baselineTo,
  className,
  compact = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => parseISO(from))
  const [activeField, setActiveField] = useState<RangeField>('from')

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const fromD = parseISO(from)
  const toD = parseISO(to)

  const applyPreset = (start: Date, end: Date) => {
    const a = startOfDay(start)
    const b = startOfDay(end)
    const [lo, hi] = isBefore(a, b) ? [a, b] : [b, a]
    onChange(format(lo, 'yyyy-MM-dd'), format(hi, 'yyyy-MM-dd'))
  }

  const anchor = startOfDay(new Date())

  const presets: { label: string; run: () => void }[] = [
    {
      label: 'Last 2 weeks',
      run: () => applyPreset(subDays(anchor, 13), anchor),
    },
    {
      label: 'Last 4 weeks',
      run: () => applyPreset(subDays(anchor, 27), anchor),
    },
    {
      label: 'Last 8 weeks',
      run: () => applyPreset(subDays(anchor, 55), anchor),
    },
    {
      label: 'Last 12 weeks',
      run: () => applyPreset(subDays(anchor, 83), anchor),
    },
    {
      label: 'Month to date',
      run: () => applyPreset(startOfMonth(anchor), anchor),
    },
    {
      label: 'Last 90 days',
      run: () => applyPreset(subDays(anchor, 89), anchor),
    },
  ]

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const gridDays = eachDayOfInterval({ start: calStart, end: calEnd })

  const inRange = (d: Date) => {
    const ds = format(d, 'yyyy-MM-dd')
    return ds >= from && ds <= to
  }

  const pickDay = (d: Date) => {
    if (!isSameMonth(d, viewMonth)) setViewMonth(startOfMonth(d))
    const picked = format(startOfDay(d), 'yyyy-MM-dd')
    if (activeField === 'from') {
      if (picked > to) onChange(picked, picked)
      else onChange(picked, to)
      setActiveField('to')
    } else {
      if (picked < from) onChange(picked, from)
      else onChange(from, picked)
    }
  }

  const handleClear = () => {
    onChange(baselineFrom, baselineTo)
    setOpen(false)
  }

  const handleToday = () => {
    const end = startOfDay(new Date())
    const start = subDays(end, 29)
    onChange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
    setViewMonth(end)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => {
          if (!open) setViewMonth(parseISO(from))
          setOpen(!open)
        }}
        className={cn(
          'flex w-full max-w-md min-w-0 items-center gap-2 rounded-lg border border-wl-surface bg-wl-card text-left shadow-sm transition',
          'hover:border-wl-teal/35 focus:outline-none focus:ring-2 focus:ring-wl-teal/25 lg:max-w-none',
          open && 'border-wl-teal/50 ring-2 ring-wl-teal/20',
          compact
            ? 'h-10 min-h-10 shrink-0 px-3 py-0 text-sm text-wl-ink hover:border-wl-teal/40'
            : 'rounded-xl py-2.5 pl-3 pr-2',
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {compact ? (
          <>
            <CalendarRange
              className="h-3.5 w-3.5 shrink-0 text-wl-ink-muted"
              aria-hidden
            />
            <span className="shrink-0 font-semibold uppercase tracking-wide text-wl-ink-muted">
              Date:
            </span>
            <span className="min-w-0 max-w-[min(100%,12rem)] flex-1 truncate font-medium tabular-nums text-wl-ink sm:max-w-[14rem]">
              {format(fromD, 'MM/dd/yyyy')}
              <span className="font-medium text-wl-ink-muted"> – </span>
              {format(toD, 'MM/dd/yyyy')}
            </span>
          </>
        ) : (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-wl-teal-soft text-wl-teal">
              <CalendarRange className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] text-wl-ink-muted">
                Reporting period
              </span>
              <span className="mt-0.5 block truncate text-sm font-semibold tabular-nums text-wl-ink">
                {format(fromD, 'MM/dd/yyyy')}
                <span className="font-medium text-wl-ink-muted"> – </span>
                {format(toD, 'MM/dd/yyyy')}
              </span>
            </span>
          </>
        )}
        {!compact && (
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-wl-ink-muted transition',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,28rem)] overflow-hidden rounded-2xl border border-wl-surface bg-wl-card shadow-xl shadow-slate-900/10 lg:w-[34rem]"
          role="dialog"
          aria-label="Date range"
        >
          <div className="flex flex-col sm:flex-row">
            <div className="border-b border-wl-surface sm:w-44 sm:border-b-0 sm:border-r">
              <p className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-wl-ink-muted">
                Quick ranges
              </p>
              <ul className="max-h-52 space-y-0.5 overflow-y-auto px-2 pb-3 sm:max-h-none">
                {presets.map((p) => (
                  <li key={p.label}>
                    <button
                      type="button"
                      onClick={() => {
                        p.run()
                        setOpen(false)
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-wl-ink transition hover:bg-wl-teal-soft hover:text-wl-teal-muted"
                    >
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0 flex-1 p-4">
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveField('from')}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition',
                    activeField === 'from'
                      ? 'border-wl-teal bg-wl-teal-soft text-wl-ink'
                      : 'border-wl-surface bg-wl-card text-wl-ink-muted hover:border-wl-teal/40',
                  )}
                >
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-wl-ink-muted">
                    Start
                  </span>
                  {format(fromD, 'MM/dd/yyyy')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveField('to')}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition',
                    activeField === 'to'
                      ? 'border-wl-teal bg-wl-teal-soft text-wl-ink'
                      : 'border-wl-surface bg-wl-card text-wl-ink-muted hover:border-wl-teal/40',
                  )}
                >
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-wl-ink-muted">
                    End
                  </span>
                  {format(toD, 'MM/dd/yyyy')}
                </button>
              </div>

              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-wl-ink-muted transition hover:bg-wl-teal-soft hover:text-wl-teal-muted"
                  onClick={() => setViewMonth((m) => subMonths(m, 1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm font-semibold text-wl-ink">
                  {format(viewMonth, 'MMMM yyyy')}
                </span>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-wl-ink-muted transition hover:bg-wl-teal-soft hover:text-wl-teal-muted"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold uppercase tracking-wide text-wl-ink-muted">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {gridDays.map((day) => {
                  const iso = format(day, 'yyyy-MM-dd')
                  const muted = !isSameMonth(day, viewMonth)
                  const isStart = isSameDay(day, fromD)
                  const isEnd = isSameDay(day, toD)
                  const between = inRange(day) && !isStart && !isEnd
                  const oneDay = isStart && isEnd
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => pickDay(day)}
                      className={cn(
                        'relative aspect-square max-h-9 text-xs font-semibold transition',
                        muted && 'text-wl-ink-muted/40',
                        !muted && !between && !(isStart || isEnd) && 'text-wl-ink',
                        between && 'bg-wl-teal-soft text-wl-ink',
                        (isStart || isEnd) &&
                          'bg-wl-teal text-white shadow-sm',
                        !between && !(isStart || isEnd) && !muted && 'hover:bg-wl-teal-soft hover:text-wl-teal-muted',
                        oneDay && 'rounded-lg',
                        !oneDay && isStart && 'rounded-l-lg',
                        !oneDay && isEnd && 'rounded-r-lg',
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-wl-surface pt-3">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-semibold text-wl-ink-muted hover:text-wl-ink hover:underline"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="text-xs font-semibold text-wl-teal hover:text-wl-teal-muted hover:underline"
                >
                  Last 30 days → today
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
