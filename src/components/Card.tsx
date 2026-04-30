import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

export function Card({
  children,
  className,
  title,
  subtitle,
  action,
}: {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-wl-surface bg-wl-card shadow-sm shadow-slate-900/5',
        className,
      )}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-wl-surface px-5 py-4">
          <div>
            {title && (
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-wl-ink-muted">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-[13px] text-wl-ink-muted">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
