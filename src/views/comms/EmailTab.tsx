import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { staff, weeklyEmailVolume } from '../../data/mockDashboard'
import { Card } from '../../components/Card'
import {
  CHART_GRID,
  CHART_TICK,
  CHART_TICK_SM,
  TOOLTIP_STYLE,
} from '../../constants/chart'
import { fmtFixed, fmtInt } from '../../utils/format'
import { useCommsEmailData } from '../../hooks/useCommsEmailData'

export function EmailTab({
  commsPeriodFrom,
  commsPeriodTo,
  commsFilterClients,
  commsFilterStaff,
}: {
  commsPeriodFrom: string
  commsPeriodTo: string
  commsFilterClients: string[] | null
  commsFilterStaff: string[] | null
}) {
  const { inboundWeekly, inboundTopClients, last4WeeksEmail } =
    useCommsEmailData({
      commsPeriodFrom,
      commsPeriodTo,
      commsFilterClients,
      commsFilterStaff,
    })

  const staffForList =
    commsFilterStaff === null
      ? staff
      : staff.filter((s) => commsFilterStaff.includes(s.id))

  return (
    <>
      <Card
        title="Email volume vs logged time"
        subtitle="Recent weeks in your toolbar range — team totals and per staff member."
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
            {staffForList.map((s) => {
              const chartWeekSet = new Set(
                last4WeeksEmail.map((r) => String(r.week)),
              )
              const last = weeklyEmailVolume.filter(
                (w) =>
                  w.staffId === s.id && chartWeekSet.has(w.weekStart),
              )
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
                        Weeks in view · {fmtInt(sent)} sent ·{' '}
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
        subtitle="Weeks in your toolbar range — how many messages clients are sending us."
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
              <span>Top clients · recent window</span>
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
    </>
  )
}