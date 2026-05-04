import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useDashboard } from '../context/DashboardContext'
import { Card } from '../components/Card'
import { ClientPicker } from '../components/ClientPicker'
import { DateRangePicker } from '../components/DateRangePicker'
import {
  CHART_GRID,
  CHART_TICK,
  CHART_TICK_SM,
  TOOLTIP_STYLE,
} from '../constants/chart'
import {
  SENTIMENT_BAND_EDGES,
  SENTIMENT_Y_TICK_VALUES,
  SENT_STYLE,
  sentimentLevel,
  sentimentYTickLabel,
  type SentLevel,
} from '../constants/sentiment'
import { cn } from '../utils/cn'
import { fmtFixed, fmtInt } from '../utils/format'
import { useSentimentData } from '../hooks/useSentimentData'

export type SentimentState = {
  sentimentClientId: string | null
  setSentimentClientId: (next: string | null) => void
  sentimentDrill: { clientId: string; periodEnd: string } | null
  setSentimentDrill: (
    next: { clientId: string; periodEnd: string } | null,
  ) => void
  sentimentPeriodFrom: string
  sentimentPeriodTo: string
  setSentimentPeriod: (from: string, to: string) => void
  sentimentPeriodBaselineFrom: string
  sentimentPeriodBaselineTo: string
}

export default function SentimentView({ state }: { state: SentimentState }) {
  const {
    sentimentClientId,
    setSentimentClientId,
    setSentimentDrill,
    sentimentPeriodFrom,
    sentimentPeriodTo,
    setSentimentPeriod,
    sentimentPeriodBaselineFrom,
    sentimentPeriodBaselineTo,
  } = state

  const { snapshot } = useDashboard()
  const clients = snapshot?.clients ?? []
  const sentimentCells = snapshot?.sentimentCells ?? []
  const sentimentBiweekly = snapshot?.sentimentBiweekly ?? []

  const { sentimentTrend } = useSentimentData({
    sentimentClientId,
    sentimentDrill: null,
    sentimentPeriodFrom,
    sentimentPeriodTo,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <div className="flex w-full min-w-0 flex-col gap-2 sm:ml-auto sm:w-auto sm:max-w-2xl sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <DateRangePicker
            from={sentimentPeriodFrom}
            to={sentimentPeriodTo}
            onChange={setSentimentPeriod}
            baselineFrom={sentimentPeriodBaselineFrom}
            baselineTo={sentimentPeriodBaselineTo}
            compact
            className="w-full min-w-0 sm:w-auto"
          />
          <ClientPicker
            mode="single"
            clients={clients}
            value={sentimentClientId}
            onChange={setSentimentClientId}
            allowAllCompanies
            className="w-full shrink-0 sm:w-80"
          />
        </div>
      </div>

      <Card
        title="Sentiment trend (per client)"
        subtitle={`${
          sentimentClientId == null
            ? 'All companies · weighted blend'
            : (clients.find((c) => c.id === sentimentClientId)?.name ?? 'Client')
        } · ${format(parseISO(sentimentPeriodFrom), 'MMM d')} – ${format(parseISO(sentimentPeriodTo), 'MMM d, yyyy')} · bi-weekly`}
      >
        {(() => {
          const data = sentimentTrend.map((r) => ({
            periodEnd: r.periodEnd,
            score: r.score,
            msgCount: r.msgCount,
            topReason: r.topReason,
          }))
          const latest = data[data.length - 1]
          const oldest = data[0]
          const delta =
            latest && oldest ? latest.score - oldest.score : 0
          const latestLevel = latest
            ? sentimentLevel(latest.score)
            : 'neutral'
          const latestStyle = SENT_STYLE[latestLevel]
          const biCount = data.length
          const shiftQualifier =
            biCount >= 2
              ? `Period shift · ${biCount} bi-weekly snapshots`
              : 'Period shift'

          if (data.length === 0) {
            return (
              <div className="flex min-h-[18rem] items-center justify-center rounded-xl border border-dashed border-wl-surface bg-wl-page text-sm text-wl-ink-muted">
                No sentiment snapshots fall in this period. Widen the date range.
              </div>
            )
          }

          return (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-wl-ink-muted">
                    Latest
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-semibold',
                      latestStyle.bg,
                      latestStyle.border,
                      latestStyle.text,
                    )}
                  >
                    <span className="text-base leading-none" aria-hidden>
                      {latestStyle.emoji}
                    </span>
                    {latestStyle.label}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-wl-ink-muted">
                    {shiftQualifier}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 font-semibold tabular-nums',
                      delta > 0.05
                        ? 'text-emerald-600'
                        : delta < -0.05
                          ? 'text-rose-600'
                          : 'text-wl-ink-muted',
                    )}
                  >
                    {delta > 0.05 && <TrendingUp className="h-4 w-4" />}
                    {delta < -0.05 && <TrendingDown className="h-4 w-4" />}
                    {delta > 0 ? '+' : ''}
                    {fmtFixed(delta, 2)}
                  </span>
                </span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data}
                    margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART_GRID}
                    />
                    <XAxis
                      dataKey="periodEnd"
                      tick={CHART_TICK_SM}
                      tickFormatter={(d) =>
                        format(parseISO(String(d)), 'MMM d')
                      }
                    />
                    <YAxis
                      tick={CHART_TICK}
                      domain={[-1, 1]}
                      ticks={[...SENTIMENT_Y_TICK_VALUES]}
                      tickFormatter={(v) => sentimentYTickLabel(Number(v))}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={(d) =>
                        format(parseISO(String(d)), 'MMM d, yyyy')
                      }
                      formatter={(v, _n, ctx) => {
                        const num = Number(v)
                        const lvl = sentimentLevel(num)
                        const row = (ctx as
                          | {
                              payload?: {
                                msgCount?: number
                                topReason?: string
                              }
                            }
                          | undefined)?.payload
                        return [
                          `${SENT_STYLE[lvl].emoji} ${SENT_STYLE[lvl].label} (${fmtFixed(num, 2)}) · ${fmtInt(row?.msgCount ?? 0)} msgs`,
                          'Sentiment',
                        ]
                      }}
                    />
                    {SENTIMENT_BAND_EDGES.map((y) => (
                      <ReferenceLine
                        key={y}
                        y={y}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        strokeOpacity={0.65}
                      />
                    ))}
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#0e7490"
                      strokeWidth={2}
                      dot={(props: {
                        cx?: number
                        cy?: number
                        payload?: { score: number }
                      }) => {
                        const { cx = 0, cy = 0, payload } = props
                        const lvl = sentimentLevel(payload?.score ?? 0)
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill={SENT_STYLE[lvl].fill}
                            stroke="#fff"
                            strokeWidth={1.5}
                          />
                        )
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {latest && (
                <p className="mt-2 text-[11px] text-wl-ink-muted">
                  Latest period top reason:{' '}
                  <span className="text-wl-ink">{latest.topReason}</span>
                </p>
              )}
            </>
          )
        })()}
      </Card>

      <Card
        title="Client sentiment heatmap"
        subtitle="Click any cell for the AI's reasoning, sample messages, and the staff × contact matrix."
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
                    const cell =
                      sentimentCells.find(
                        (s) =>
                          s.clientId === c.id && s.windowWeeks === w,
                      ) ?? {
                        clientId: c.id,
                        windowWeeks: w,
                        score: 0,
                        volume: 0,
                        trend: 'flat' as const,
                      }
                    const lvl = sentimentLevel(cell.score)
                    const style = SENT_STYLE[lvl]
                    // Find a matching biweekly period (best-effort) so
                    // the drilldown opens with the most-recent window.
                    const periodCount = w / 2
                    const recent = sentimentBiweekly
                      .filter((r) => r.clientId === c.id)
                      .slice(-periodCount)
                      .pop()
                    const periodEnd =
                      recent?.periodEnd ??
                      sentimentBiweekly.find(
                        (r) => r.clientId === c.id,
                      )?.periodEnd ??
                      ''
                    return (
                      <td key={w} className="p-0">
                        <button
                          type="button"
                          onClick={() =>
                            setSentimentDrill({
                              clientId: c.id,
                              periodEnd,
                            })
                          }
                          className={cn(
                            'flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition hover:scale-[1.02] hover:shadow-sm',
                            style.bg,
                            style.border,
                          )}
                          title={`${style.label} · ${fmtInt(cell.volume)} msgs · ${cell.trend}`}
                        >
                          <span className="text-xl leading-none" aria-hidden>
                            {style.emoji}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-semibold uppercase tracking-wide',
                              style.text,
                            )}
                          >
                            {style.label}
                          </span>
                          <span className="text-[10px] text-wl-ink-muted">
                            {fmtInt(cell.volume)} msgs
                          </span>
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-wl-ink-muted">
          {(
            [
              'delighted',
              'satisfied',
              'neutral',
              'frustrated',
              'angry',
            ] as const satisfies readonly SentLevel[]
          ).map((l) => {
            const s = SENT_STYLE[l]
            return (
              <span
                key={l}
                className="inline-flex items-center gap-1.5 font-medium"
              >
                <span className="text-base leading-none" aria-hidden>
                  {s.emoji}
                </span>
                {s.label}
              </span>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
