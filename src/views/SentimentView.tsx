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
import {
  clients,
  sentimentBiweekly,
  sentimentCells,
} from '../data/mockDashboard'
import { Card } from '../components/Card'
import {
  CHART_GRID,
  CHART_TICK,
  CHART_TICK_SM,
  TOOLTIP_STYLE,
} from '../constants/chart'
import { SENT_STYLE, sentimentLevel } from '../constants/sentiment'
import { cn } from '../utils/cn'
import { fmtFixed, fmtInt } from '../utils/format'
import { useSentimentData } from '../hooks/useSentimentData'

export type SentimentState = {
  sentimentClientId: string
  setSentimentClientId: (next: string) => void
  sentimentDrill: { clientId: string; periodEnd: string } | null
  setSentimentDrill: (
    next: { clientId: string; periodEnd: string } | null,
  ) => void
}

export default function SentimentView({ state }: { state: SentimentState }) {
  const {
    sentimentClientId,
    setSentimentClientId,
    setSentimentDrill,
  } = state

  const { sentimentTrend } = useSentimentData({
    sentimentClientId,
    sentimentDrill: null,
  })

  return (
    <div className="space-y-6">
      <Card
        title="Sentiment trend (per client)"
        subtitle="Bi-weekly sentiment over the last 24 weeks. Goes deeper than the heatmap snapshot."
        action={
          <select
            value={sentimentClientId}
            onChange={(e) => setSentimentClientId(e.target.value)}
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
            : 'meh'
          const latestStyle = SENT_STYLE[latestLevel]
          const LatestIcon = latestStyle.Icon
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
                    <LatestIcon className="h-4 w-4" />
                    {latestStyle.label}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-wl-ink-muted">
                    24-week shift
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
                      tickFormatter={(v) => {
                        const n = Number(v)
                        if (n >= 0.4) return '😀'
                        if (n >= 0) return '😐'
                        if (n >= -0.4) return '😞'
                        return '😠'
                      }}
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
                          `${SENT_STYLE[lvl].label} (${fmtFixed(num, 2)}) · ${fmtInt(row?.msgCount ?? 0)} msgs`,
                          'Sentiment',
                        ]
                      }}
                    />
                    <ReferenceLine
                      y={0.4}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                    />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    <ReferenceLine
                      y={-0.4}
                      stroke="#e11d48"
                      strokeDasharray="4 4"
                    />
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
                    const cell = sentimentCells.find(
                      (s) =>
                        s.clientId === c.id && s.windowWeeks === w,
                    )!
                    const lvl = sentimentLevel(cell.score)
                    const style = SENT_STYLE[lvl]
                    const Icon = style.Icon
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
                          <Icon className={cn('h-5 w-5', style.text)} />
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
          {(['happy', 'meh', 'sad', 'frustrated'] as const).map((l) => {
            const s = SENT_STYLE[l]
            const Ic = s.Icon
            return (
              <span
                key={l}
                className="inline-flex items-center gap-1.5 font-medium"
              >
                <Ic className={cn('h-4 w-4', s.text)} />
                {s.label}
              </span>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
