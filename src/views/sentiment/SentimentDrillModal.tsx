import { format, parseISO, subDays } from 'date-fns'
import { Network, X } from 'lucide-react'
import {
  clientContacts,
  clients,
  staff,
  type PairwiseSentiment,
  type SentimentBiweekly,
  type SentimentSampleSet,
} from '../../data/mockDashboard'
import { SENT_STYLE, sentimentLevel } from '../../constants/sentiment'
import { cn } from '../../utils/cn'
import { fmtInt } from '../../utils/format'

type SentimentDrillData = {
  cell: SentimentBiweekly
  samples: SentimentSampleSet | undefined
  pairs: PairwiseSentiment[]
}

export function SentimentDrillModal({
  data,
  onClose,
}: {
  data: SentimentDrillData
  onClose: () => void
}) {
  const { cell, samples, pairs } = data
  const lvl = sentimentLevel(cell.score)
  const style = SENT_STYLE[lvl]
  const Icon = style.Icon
  const client = clients.find((c) => c.id === cell.clientId)
  const startDate = format(subDays(parseISO(cell.periodEnd), 13), 'MMM d')
  const endDate = format(parseISO(cell.periodEnd), 'MMM d, yyyy')
  const clientStaff = staff.slice(0, 5)
  const clientPeople = clientContacts.filter(
    (c) => c.clientId === cell.clientId,
  )

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-wl-ink/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sentiment-drill-title"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-wl-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-wl-surface px-5 py-4">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
              Sentiment analysis profile
            </span>
            <h3
              id="sentiment-drill-title"
              className="mt-1 flex flex-wrap items-center gap-3 text-lg font-bold text-wl-ink"
            >
              {client?.name}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
                  style.bg,
                  style.border,
                  style.text,
                )}
              >
                <Icon className="h-4 w-4" />
                {style.label}
              </span>
            </h3>
            <p className="mt-0.5 text-xs text-wl-ink-muted">
              Window {startDate} — {endDate} ·{' '}
              {fmtInt(cell.msgCount)} messages analyzed
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-2 text-wl-ink-muted transition hover:bg-wl-teal-soft hover:text-wl-teal-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
              Why this score
            </h4>
            <ul className="mt-2 space-y-2">
              {(samples?.reasons ?? [cell.topReason]).map((r, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-wl-surface bg-wl-page px-3 py-2 text-sm text-wl-ink"
                >
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
              Sample messages
            </h4>
            <ul className="mt-2 space-y-2">
              {(samples?.excerpts ?? []).map((x, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-wl-surface bg-wl-page px-3 py-2"
                >
                  <div className="flex items-center justify-between text-[11px] text-wl-ink-muted">
                    <span className="font-semibold text-wl-ink">
                      {x.fromName}
                    </span>
                    <span>
                      {format(parseISO(x.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-wl-ink">{x.snippet}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <Network className="h-3.5 w-3.5" />
                Person-to-person sentiment
              </span>
            </h4>
            <p className="mt-1 text-xs text-wl-ink-muted">
              Each cell shows how the client contact feels
              interacting with that staff member.
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border border-wl-surface bg-wl-page px-2 py-2 text-left font-semibold text-wl-ink-muted">
                      Client contact ↓ · Staff →
                    </th>
                    {clientStaff.map((st) => (
                      <th
                        key={st.id}
                        className="border border-wl-surface bg-wl-page px-2 py-2 text-center font-semibold text-wl-ink"
                        title={st.name}
                      >
                        {st.initials}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientPeople.map((person) => (
                    <tr key={person.id}>
                      <td className="border border-wl-surface bg-wl-page px-2 py-2 font-medium text-wl-ink">
                        <div className="truncate">{person.name}</div>
                        <div className="truncate text-[10px] text-wl-ink-muted">
                          {person.role}
                        </div>
                      </td>
                      {clientStaff.map((st) => {
                        const pair = pairs.find(
                          (p) =>
                            p.contactId === person.id &&
                            p.staffId === st.id,
                        )
                        if (!pair) {
                          return (
                            <td
                              key={st.id}
                              className="border border-wl-surface bg-wl-page px-2 py-2 text-center text-wl-ink-muted"
                            >
                              —
                            </td>
                          )
                        }
                        const pl = sentimentLevel(pair.score)
                        const ps = SENT_STYLE[pl]
                        const PIcon = ps.Icon
                        return (
                          <td
                            key={st.id}
                            className={cn(
                              'border border-wl-surface px-2 py-2 text-center',
                              ps.bg,
                            )}
                            title={pair.note}
                          >
                            <PIcon
                              className={cn(
                                'mx-auto h-4 w-4',
                                ps.text,
                              )}
                            />
                            <div className="mt-0.5 text-[10px] text-wl-ink-muted">
                              {fmtInt(pair.msgCount)}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-wl-ink-muted">
              Hover any cell for the AI's note on that
              relationship.
            </p>
          </div>

          <div className="rounded-xl border border-dashed border-wl-teal/40 bg-wl-teal-soft/30 px-3 py-3 text-xs text-wl-teal-muted">
            <strong className="text-wl-teal">
              Suggested next steps:
            </strong>{' '}
            Schedule a check-in with the client lead;
            reassign threads where the matrix shows red cells.
          </div>
        </div>
      </div>
    </div>
  )
}
