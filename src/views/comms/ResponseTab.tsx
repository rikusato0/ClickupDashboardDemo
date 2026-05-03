import { useState } from 'react'
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
import { format, parseISO } from 'date-fns'
import { Bell, TrendingDown, TrendingUp } from 'lucide-react'
import { Card } from '../../components/Card'
import {
  CHART_GRID,
  CHART_TICK,
  CHART_TICK_SM,
  TOOLTIP_STYLE,
} from '../../constants/chart'
import {
  FAST_MAX_MIN,
  SEVERITY_BADGE,
  SEVERITY_FILL,
  SEVERITY_LABEL,
  SEVERITY_TEXT,
  WARNING_MAX_MIN,
  responseSeverity,
} from '../../constants/severity'
import { cn } from '../../utils/cn'
import { fmtFixed, fmtMinutes } from '../../utils/format'
import { useCommsResponseData } from '../../hooks/useCommsResponseData'
import { ResponseAlertSettingsDialog } from './ResponseAlertSettingsDialog'

export function ResponseTab({
  commsPeriodFrom,
  commsPeriodTo,
  commsFilterClients,
  commsFilterStaff,
  respAlertDirection,
  setRespAlertDirection,
  respAlertThreshold,
  setRespAlertThreshold,
}: {
  commsPeriodFrom: string
  commsPeriodTo: string
  commsFilterClients: string[] | null
  commsFilterStaff: string[] | null
  respAlertDirection: 'above' | 'below'
  setRespAlertDirection: (next: 'above' | 'below') => void
  respAlertThreshold: number
  setRespAlertThreshold: (next: number) => void
}) {
  const [alertOpen, setAlertOpen] = useState(false)

  const {
    teamMedian,
    respByStaff,
    respByContactPriority,
    respTrend,
  } = useCommsResponseData({
    commsPeriodFrom,
    commsPeriodTo,
    commsFilterClients,
    commsFilterStaff,
  })

  return (
    <>
      <div className="flex flex-wrap justify-end">
        <button
          type="button"
          onClick={() => setAlertOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-wl-surface bg-wl-card px-4 py-2 text-sm font-semibold text-wl-ink shadow-sm transition hover:border-wl-teal/40"
        >
          <Bell className="h-4 w-4 text-wl-orange" />
          Alert settings
        </button>
      </div>

      <ResponseAlertSettingsDialog
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        direction={respAlertDirection}
        onDirectionChange={setRespAlertDirection}
        thresholdMinutes={respAlertThreshold}
        onThresholdChange={setRespAlertThreshold}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Team median response">
          {(() => {
            const sev =
              teamMedian <= 0
                ? ('fast' as const)
                : responseSeverity(teamMedian)
            return (
              <>
                <div className="flex items-baseline gap-3">
                  <p
                    className={cn(
                      'text-3xl font-bold',
                      teamMedian <= 0
                        ? 'text-wl-ink-muted'
                        : SEVERITY_TEXT[sev],
                    )}
                  >
                    {teamMedian <= 0 ? '—' : fmtMinutes(teamMedian)}
                  </p>
                  {teamMedian > 0 && (
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                        SEVERITY_BADGE[sev],
                      )}
                    >
                      {SEVERITY_LABEL[sev]}
                    </span>
                  )}
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
        subtitle="Daily team median for the dates in your toolbar — 14-day average compares the start vs end of that window."
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
              .filter((row) => row.median > 0)
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
    </>
  )
}
