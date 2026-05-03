import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO, subDays } from 'date-fns'
import {
  Activity,
  Bell,
  CalendarClock,
  ChevronRight,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  COMMS_CATEGORIES,
  COMMS_CATEGORY_COLORS,
  clients,
  patternTrends,
} from '../../data/mockDashboard'
import { Card } from '../../components/Card'
import {
  CHART_GRID,
  CHART_TICK,
  CHART_TICK_SM,
  TOOLTIP_STYLE,
} from '../../constants/chart'
import { cn } from '../../utils/cn'
import { fmtFixed, fmtInt } from '../../utils/format'
import { useCommsPatternsData } from '../../hooks/useCommsPatternsData'

export function PatternsTab({
  commsFilterClients,
  commsPeriodFrom,
  commsPeriodTo,
  onOpenDrill,
}: {
  commsFilterClients: string[] | null
  commsPeriodFrom: string
  commsPeriodTo: string
  onOpenDrill: (id: string) => void
}) {
  const {
    patternMixTotals,
    monthlyPatternsForClient,
    upcomingPredictedNeeds,
  } = useCommsPatternsData({
    commsFilterClients,
    commsPeriodFrom,
    commsPeriodTo,
    patternDrillId: null,
  })

  return (
    <>
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
                      onClick={() => onOpenDrill(p.id)}
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
        title="Monthly breakdown"
        subtitle="Stacked inbound mix for the clients and months in your toolbar filters."
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
                          onClick={() => onOpenDrill(pat.id)}
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
      </Card>
    </>
  )
}
