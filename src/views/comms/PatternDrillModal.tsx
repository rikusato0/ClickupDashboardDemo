import { format, parseISO } from 'date-fns'
import { X } from 'lucide-react'
import {
  type CommsCategory,
  type PatternSample,
} from '../../types/dashboard'
import { COMMS_CATEGORY_COLORS } from '../../types/dashboard'
import { fmtInt } from '../../utils/format'

type PatternDrill = {
  trend: {
    id: string
    label: string
    category: CommsCategory
    weeklyVolumes: number[]
  }
  samples: PatternSample[]
}

export function PatternDrillModal({
  drill,
  onClose,
}: {
  drill: PatternDrill
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="pattern-drill-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-wl-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-wl-surface px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{
                  background: COMMS_CATEGORY_COLORS[drill.trend.category],
                }}
                aria-hidden
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
                {drill.trend.category}
              </span>
            </div>
            <h3
              id="pattern-drill-title"
              className="mt-1 text-lg font-bold text-wl-ink"
            >
              {drill.trend.label}
            </h3>
            <p className="mt-0.5 text-xs text-wl-ink-muted">
              Last 12 weeks ·{' '}
              {fmtInt(
                drill.trend.weeklyVolumes.reduce((a, x) => a + x, 0),
              )}{' '}
              messages tagged
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
              Why this pattern was tagged
            </h4>
            <p className="mt-2 rounded-xl border border-wl-surface bg-wl-page px-3 py-3 text-sm text-wl-ink">
              The classifier flagged threads with subject lines and body
              language matching the{' '}
              <span className="font-semibold">
                {drill.trend.label.toLowerCase()}
              </span>{' '}
              template. Demo placeholder — production text will surface
              the AI's exact reasoning + classification confidence.
            </p>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
              Sample messages ({drill.samples.length})
            </h4>
            <ul className="mt-2 space-y-2">
              {drill.samples.map((s, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-wl-surface bg-wl-page px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-wl-ink-muted">
                    <span>
                      <span className="font-semibold text-wl-ink">
                        {s.fromContact}
                      </span>{' '}
                      → {s.toStaff}
                    </span>
                    <span>{format(parseISO(s.date), 'MMM d, yyyy')}</span>
                  </div>
                  <p className="mt-1 text-sm text-wl-ink">{s.snippet}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-dashed border-wl-teal/40 bg-wl-teal-soft/30 px-3 py-3 text-xs text-wl-teal-muted">
            <strong className="text-wl-teal">Suggested action:</strong>{' '}
            If this pattern keeps growing in the "Ad hoc requests"
            bucket, consider promoting it to a recurring engagement so
            the firm bills it predictably.
          </div>
        </div>
      </div>
    </div>
  )
}
