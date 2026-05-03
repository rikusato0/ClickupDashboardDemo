import { useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { fmtMinutes } from '../../utils/format'

export function ResponseAlertSettingsDialog({
  open,
  onClose,
  direction,
  onDirectionChange,
  thresholdMinutes,
  onThresholdChange,
}: {
  open: boolean
  onClose: () => void
  direction: 'above' | 'below'
  onDirectionChange: (next: 'above' | 'below') => void
  thresholdMinutes: number
  onThresholdChange: (next: number) => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

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
        aria-labelledby="resp-alert-title"
        className="w-full max-w-md rounded-2xl bg-wl-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-wl-surface px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wl-orange/10 text-wl-orange">
              <Bell className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2
                id="resp-alert-title"
                className="text-base font-bold text-wl-ink"
              >
                Response-time alert
              </h2>
              <p className="mt-1 text-xs leading-snug text-wl-ink-muted">
                Email notifications will send when this rule is met once your
                backend is connected.
              </p>
            </div>
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
        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-wl-ink">
            <span className="font-medium">When a client&apos;s median is</span>
            <select
              value={direction}
              onChange={(e) =>
                onDirectionChange(e.target.value as 'above' | 'below')
              }
              className="rounded-lg border border-wl-surface bg-wl-card px-3 py-1.5 text-sm font-medium text-wl-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-wl-teal/30"
              aria-label="Alert direction"
            >
              <option value="above">above</option>
              <option value="below">below</option>
            </select>
            <input
              type="number"
              min={0}
              step={5}
              value={thresholdMinutes}
              onChange={(e) =>
                onThresholdChange(Math.max(0, Number(e.target.value) || 0))
              }
              className="w-24 rounded-lg border border-wl-surface bg-wl-card px-3 py-1.5 text-sm font-medium tabular-nums text-wl-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-wl-teal/30"
              aria-label="Threshold in minutes"
            />
            <span className="text-wl-ink-muted">
              ({fmtMinutes(thresholdMinutes)})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-wl-teal px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
