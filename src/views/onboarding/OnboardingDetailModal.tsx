import { X } from 'lucide-react'
import {
  type OnboardingClient,
  type OnboardingDetail,
} from '../../data/mockDashboard'
import { cn } from '../../utils/cn'
import { fmtInt } from '../../utils/format'

export function OnboardingDetailModal({
  detail,
  client,
  onClose,
}: {
  detail: OnboardingDetail
  client: OnboardingClient | undefined
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-wl-ink/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-wl-surface bg-wl-card shadow-2xl"
        role="dialog"
        aria-labelledby="onboarding-detail-title"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-wl-surface bg-wl-card px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-wl-teal">
              Onboarding detail
            </p>
            <h2
              id="onboarding-detail-title"
              className="text-lg font-bold text-wl-ink"
            >
              {client?.clientName ?? 'Client'}
            </h2>
            <p className="mt-1 text-xs text-wl-ink-muted">
              {client?.stage ?? ''} ·{' '}
              {fmtInt(client?.percentComplete ?? 0)}% complete
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-wl-ink-muted transition hover:bg-wl-teal-soft hover:text-wl-teal-muted"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-5 px-5 py-4 text-sm text-wl-ink">
          <p className="leading-relaxed text-wl-ink-muted">
            {detail.executiveSummary}
          </p>
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-wl-ink-muted">
              Milestones
            </h3>
            <ul className="space-y-2">
              {detail.milestones.map((m) => (
                <li
                  key={`${m.date}-${m.label}`}
                  className="flex flex-col gap-1 border-b border-wl-surface pb-3 text-xs last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-semibold text-wl-ink">{m.label}</span>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="tabular-nums text-wl-ink-muted">
                      {m.date}
                    </span>
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase',
                        m.status === 'done' &&
                          'bg-wl-teal-soft text-wl-teal-muted',
                        m.status === 'upcoming' &&
                          'bg-wl-surface text-wl-ink-muted',
                        m.status === 'at-risk' &&
                          'bg-wl-orange/15 text-wl-orange',
                      )}
                    >
                      {m.status === 'at-risk'
                        ? 'At risk'
                        : m.status === 'done'
                          ? 'Done'
                          : 'Upcoming'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {detail.blockers.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-wl-orange">
                Blockers
              </h3>
              <ul className="list-inside list-disc space-y-1 text-xs text-wl-ink-muted">
                {detail.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-wl-ink-muted">
              Client contacts
            </h3>
            <ul className="space-y-1 text-xs">
              {detail.clientContacts.map((c) => (
                <li key={c.name}>
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-wl-ink-muted"> — {c.role}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="rounded-xl bg-wl-teal-soft px-3 py-2 text-xs font-semibold text-wl-teal-muted">
            Next sync: {detail.nextSync}
          </p>
        </div>
      </div>
    </div>
  )
}
