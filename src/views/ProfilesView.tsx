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
import { format, parseISO, subDays } from 'date-fns'
import {
  Bell,
  CalendarClock,
  Rocket,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  COMMS_CATEGORY_COLORS,
  clientContacts,
  clients,
  staff,
} from '../data/mockDashboard'
import { Card } from '../components/Card'
import {
  CHART_GRID,
  CHART_TICK_SM,
  TOOLTIP_STYLE,
} from '../constants/chart'
import { SENT_STYLE, sentimentLevel } from '../constants/sentiment'
import { cn } from '../utils/cn'
import { fmtFixed, fmtInt } from '../utils/format'
import { useProfileData } from '../hooks/useProfileData'

export type ProfilesState = {
  profileClientId: string
  setProfileClientId: (next: string) => void
}

export default function ProfilesView({ state }: { state: ProfilesState }) {
  const { profileClientId, setProfileClientId } = state
  const {
    client,
    clientSentiment,
    recentMonth,
    recentPatternsForClient,
    upcomingForClient,
    matchedOnboarding,
    bestPairs,
    worstPairs,
    totalRecent,
  } = useProfileData(profileClientId)

  const latest = clientSentiment[clientSentiment.length - 1]
  const oldest = clientSentiment[0]
  const sentDelta = latest && oldest ? latest.score - oldest.score : 0
  const lvl = latest ? sentimentLevel(latest.score) : 'meh'
  const sentStyle = SENT_STYLE[lvl]
  const SentIcon = sentStyle.Icon

  return (
    <div className="space-y-6">
      <Card
        title="Client profile"
        subtitle="Patterns, predicted needs, sentiment, and onboarding — all in one place."
        action={
          <select
            value={profileClientId}
            onChange={(e) => setProfileClientId(e.target.value)}
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
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-wl-surface bg-wl-page p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-wl-ink-muted">
              Client
            </div>
            <div className="mt-1 text-base font-bold text-wl-ink">
              {client?.name}
            </div>
            <div className="mt-0.5 text-xs text-wl-ink-muted">
              {client?.domain}
            </div>
          </div>
          <div
            className={cn(
              'rounded-xl border p-4',
              sentStyle.bg,
              sentStyle.border,
            )}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-wl-ink-muted">
              Sentiment (latest)
            </div>
            <div className="mt-1 flex items-center gap-2">
              <SentIcon className={cn('h-5 w-5', sentStyle.text)} />
              <span
                className={cn('text-base font-bold', sentStyle.text)}
              >
                {sentStyle.label}
              </span>
            </div>
            <div
              className={cn(
                'mt-1 inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums',
                sentDelta > 0.05
                  ? 'text-emerald-700'
                  : sentDelta < -0.05
                    ? 'text-rose-700'
                    : 'text-wl-ink-muted',
              )}
            >
              {sentDelta > 0.05 && <TrendingUp className="h-3 w-3" />}
              {sentDelta < -0.05 && <TrendingDown className="h-3 w-3" />}
              24-week shift {sentDelta > 0 ? '+' : ''}
              {fmtFixed(sentDelta, 2)}
            </div>
          </div>
          <div className="rounded-xl border border-wl-surface bg-wl-page p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-wl-ink-muted">
              Top pattern (last month)
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{
                  background:
                    COMMS_CATEGORY_COLORS[
                      recentPatternsForClient[0]
                        ?.category ?? 'Ad hoc requests'
                    ],
                }}
                aria-hidden
              />
              <span className="text-sm font-bold text-wl-ink">
                {recentPatternsForClient[0]?.category ?? '—'}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-wl-ink-muted">
              {fmtInt(recentPatternsForClient[0]?.volume ?? 0)} of{' '}
              {fmtInt(totalRecent)} messages
            </div>
          </div>
          <div className="rounded-xl border border-wl-surface bg-wl-page p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-wl-ink-muted">
              Onboarding stage
            </div>
            {matchedOnboarding ? (
              <>
                <div className="mt-1 text-sm font-bold text-wl-ink">
                  {matchedOnboarding.stage}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-wl-surface">
                  <div
                    className="h-full rounded-full bg-wl-teal"
                    style={{
                      width: `${matchedOnboarding.percentComplete}%`,
                    }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-wl-ink-muted">
                  {matchedOnboarding.percentComplete}% complete
                </div>
              </>
            ) : (
              <>
                <div className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                  <Rocket className="h-4 w-4" />
                  Active engagement
                </div>
                <div className="mt-0.5 text-xs text-wl-ink-muted">
                  Onboarding complete · servicing recurring
                  workflows.
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Recent communications mix"
          subtitle={
            recentMonth
              ? `Last full month — ${format(
                  parseISO(`${recentMonth}-01`),
                  'MMMM yyyy',
                )}.`
              : undefined
          }
        >
          <ul className="space-y-2">
            {recentPatternsForClient.map((row) => {
              const pct = totalRecent
                ? (row.volume / totalRecent) * 100
                : 0
              return (
                <li
                  key={row.category}
                  className="rounded-lg border border-wl-surface bg-wl-page px-3 py-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{
                          background:
                            COMMS_CATEGORY_COLORS[row.category],
                        }}
                        aria-hidden
                      />
                      <span className="font-medium text-wl-ink">
                        {row.category}
                      </span>
                    </span>
                    <span className="tabular-nums text-wl-ink-muted">
                      <span className="font-semibold text-wl-ink">
                        {fmtInt(row.volume)}
                      </span>{' '}
                      · {fmtFixed(pct, 0)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-wl-surface">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background:
                          COMMS_CATEGORY_COLORS[row.category],
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card title="Sentiment trend" subtitle="24 weeks · bi-weekly.">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={clientSentiment}
                margin={{ left: 4, right: 8, top: 8, bottom: 8 }}
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
                  domain={[-1, 1]}
                  tick={CHART_TICK_SM}
                  tickFormatter={(v) => {
                    const n = Number(v)
                    if (n >= 0.4) return '😀'
                    if (n >= 0) return '😐'
                    if (n >= -0.4) return '😞'
                    return '😠'
                  }}
                  width={32}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(d) =>
                    format(parseISO(String(d)), 'MMM d, yyyy')
                  }
                  formatter={(v) => {
                    const num = Number(v)
                    const l = sentimentLevel(num)
                    return [
                      `${SENT_STYLE[l].label} (${fmtFixed(num, 2)})`,
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
                  dot={{ r: 3, fill: '#0e7490' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-wl-ink-muted">
            Click any cell on the heatmap (Client sentiment tab)
            for the full analysis profile.
          </p>
        </Card>
      </div>

      <Card
        title="AI-predicted upcoming needs"
        subtitle={`Items the predictor expects ${client?.name ?? 'this client'} will need soon.`}
      >
        {upcomingForClient.length === 0 ? (
          <div className="rounded-xl border border-dashed border-wl-surface bg-wl-page px-3 py-4 text-center text-sm text-wl-ink-muted">
            No predicted needs in the model right now.
          </div>
        ) : (
          <ul className="space-y-2">
            {upcomingForClient.map((n) => {
              const due = parseISO(n.dueDate)
              const remindOn = format(subDays(due, 1), 'MMM d')
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
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Strongest staff↔contact relationships"
          subtitle="Highest sentiment pairings on this account."
        >
          <ul className="space-y-2">
            {bestPairs.map((p) => {
              const contact = clientContacts.find(
                (c) => c.id === p.contactId,
              )
              const st = staff.find((s) => s.id === p.staffId)
              const l = sentimentLevel(p.score)
              const ps = SENT_STYLE[l]
              const PIcon = ps.Icon
              return (
                <li
                  key={`${p.contactId}-${p.staffId}`}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2',
                    ps.bg,
                    ps.border,
                  )}
                >
                  <PIcon className={cn('h-5 w-5', ps.text)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-wl-ink">
                      {contact?.name} ↔ {st?.name}
                    </div>
                    <div className="truncate text-[11px] text-wl-ink-muted">
                      {p.note}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={cn(
                        'text-sm font-bold tabular-nums',
                        ps.text,
                      )}
                    >
                      {p.score > 0 ? '+' : ''}
                      {fmtFixed(p.score, 2)}
                    </div>
                    <div className="text-[10px] text-wl-ink-muted">
                      {fmtInt(p.msgCount)} msgs
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card
          title="Watch-list relationships"
          subtitle="Lowest sentiment pairings — candidates for reassignment or coaching."
        >
          <ul className="space-y-2">
            {worstPairs.map((p) => {
              const contact = clientContacts.find(
                (c) => c.id === p.contactId,
              )
              const st = staff.find((s) => s.id === p.staffId)
              const l = sentimentLevel(p.score)
              const ps = SENT_STYLE[l]
              const PIcon = ps.Icon
              return (
                <li
                  key={`${p.contactId}-${p.staffId}`}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2',
                    ps.bg,
                    ps.border,
                  )}
                >
                  <PIcon className={cn('h-5 w-5', ps.text)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-wl-ink">
                      {contact?.name} ↔ {st?.name}
                    </div>
                    <div className="truncate text-[11px] text-wl-ink-muted">
                      {p.note}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={cn(
                        'text-sm font-bold tabular-nums',
                        ps.text,
                      )}
                    >
                      {p.score > 0 ? '+' : ''}
                      {fmtFixed(p.score, 2)}
                    </div>
                    <div className="text-[10px] text-wl-ink-muted">
                      {fmtInt(p.msgCount)} msgs
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    </div>
  )
}
