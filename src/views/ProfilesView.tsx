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
import { ClientPicker } from '../components/ClientPicker'
import { DateRangePicker } from '../components/DateRangePicker'
import {
  CHART_GRID,
  CHART_TICK_SM,
  TOOLTIP_STYLE,
} from '../constants/chart'
import {
  SENTIMENT_BAND_EDGES,
  SENTIMENT_Y_TICK_VALUES,
  SENT_STYLE,
  sentimentLevel,
  sentimentYTickLabel,
} from '../constants/sentiment'
import { cn } from '../utils/cn'
import { fmtFixed, fmtInt } from '../utils/format'
import { useProfileData } from '../hooks/useProfileData'

export type ProfilesState = {
  profileClientId: string
  setProfileClientId: (next: string) => void
  profilePeriodFrom: string
  profilePeriodTo: string
  setProfilePeriod: (from: string, to: string) => void
  profilePeriodBaselineFrom: string
  profilePeriodBaselineTo: string
}

export default function ProfilesView({ state }: { state: ProfilesState }) {
  const {
    profileClientId,
    setProfileClientId,
    profilePeriodFrom,
    profilePeriodTo,
    setProfilePeriod,
    profilePeriodBaselineFrom,
    profilePeriodBaselineTo,
  } = state

  const {
    client,
    clientSentiment,
    periodLabelSummary,
    recentPatternsForClient,
    upcomingForClient,
    matchedOnboarding,
    bestPairs,
    worstPairs,
    totalRecent,
  } = useProfileData(profileClientId, profilePeriodFrom, profilePeriodTo)

  const latest = clientSentiment[clientSentiment.length - 1]
  const oldest = clientSentiment[0]
  const sentDelta = latest && oldest ? latest.score - oldest.score : 0
  const lvl = latest ? sentimentLevel(latest.score) : 'neutral'
  const sentStyle = SENT_STYLE[lvl]
  const biCount = clientSentiment.length
  const shiftQualifier =
    biCount >= 2
      ? `Period shift · ${biCount} bi-weekly snapshots`
      : 'Period shift'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <div className="flex w-full min-w-0 flex-col gap-2 sm:ml-auto sm:w-auto sm:max-w-2xl sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <DateRangePicker
            from={profilePeriodFrom}
            to={profilePeriodTo}
            onChange={setProfilePeriod}
            baselineFrom={profilePeriodBaselineFrom}
            baselineTo={profilePeriodBaselineTo}
            compact
            className="w-full min-w-0 sm:w-auto"
          />
          <ClientPicker
            mode="single"
            clients={clients}
            value={profileClientId}
            onChange={(id) => {
              if (id !== null) setProfileClientId(id)
            }}
            className="w-full shrink-0 sm:w-80"
          />
        </div>
      </div>

      <Card
        title="Client profile"
        subtitle="Patterns, predicted needs, sentiment, and onboarding — all in one place."
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
              <span className="text-xl leading-none" aria-hidden>
                {sentStyle.emoji}
              </span>
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
              {shiftQualifier}: {sentDelta > 0 ? '+' : ''}
              {fmtFixed(sentDelta, 2)}
            </div>
          </div>
          <div className="rounded-xl border border-wl-surface bg-wl-page p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-wl-ink-muted">
              Top pattern (in period)
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
            periodLabelSummary
              ? `Calendar months overlapping your selected period — ${periodLabelSummary}.`
              : 'No months overlap the selected period.'
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

        <Card
          title="Sentiment trend"
          subtitle={`${format(parseISO(profilePeriodFrom), 'MMM d')} – ${format(parseISO(profilePeriodTo), 'MMM d, yyyy')} · bi-weekly`}
        >
          <div className="h-56">
            {clientSentiment.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-wl-surface bg-wl-page text-sm text-wl-ink-muted">
                No sentiment snapshots fall in this period. Widen the
                date range.
              </div>
            ) : (
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
                    ticks={[...SENTIMENT_Y_TICK_VALUES]}
                    tick={CHART_TICK_SM}
                    tickFormatter={(v) => sentimentYTickLabel(Number(v))}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(d) =>
                      format(parseISO(String(d)), 'MMM d, yyyy')
                    }
                    formatter={(v) => {
                      const num = Number(v)
                      const l = sentimentLevel(num)
                      const st = SENT_STYLE[l]
                      return [
                        `${st.emoji} ${st.label} (${fmtFixed(num, 2)})`,
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
                    dot={{ r: 3, fill: '#0e7490' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
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
              return (
                <li
                  key={`${p.contactId}-${p.staffId}`}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2',
                    ps.bg,
                    ps.border,
                  )}
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {ps.emoji}
                  </span>
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
              return (
                <li
                  key={`${p.contactId}-${p.staffId}`}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2',
                    ps.bg,
                    ps.border,
                  )}
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {ps.emoji}
                  </span>
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
