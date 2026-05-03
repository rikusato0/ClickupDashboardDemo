import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Check, ChevronDown, Search } from 'lucide-react'
import type { Client } from '../data/mockDashboard'
import { cn } from '../utils/cn'

type Props = {
  clients: Client[]
  value: string
  onChange: (clientId: string) => void
  className?: string
  'aria-label'?: string
}

export function ClientSelect({
  clients,
  value,
  onChange,
  className,
  'aria-label': ariaLabel = 'Client',
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = clients.find((c) => c.id === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q) ||
        c.segment.toLowerCase().includes(q) ||
        c.engagementCode.toLowerCase().includes(q),
    )
  }, [clients, query])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, filtered, value])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o)
          if (!open) setQuery('')
        }}
        className={cn(
          'flex w-full min-w-0 items-center gap-2 rounded-xl border border-wl-surface bg-wl-card py-2.5 pl-3 pr-2 text-left shadow-sm transition',
          'hover:border-wl-teal/35 focus:outline-none focus:ring-2 focus:ring-wl-teal/25',
          open && 'border-wl-teal/50 ring-2 ring-wl-teal/20',
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-wl-teal-soft text-wl-teal">
          <Building2 className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-wl-ink">
            {selected?.name ?? 'Select client'}
          </span>
          {selected && (
            <span className="mt-0.5 block truncate text-[11px] text-wl-ink-muted">
              {selected.domain} · {selected.segment}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-wl-ink-muted transition',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-xl border border-wl-surface bg-wl-card py-1 shadow-xl shadow-slate-900/10 sm:w-[22rem]"
          role="listbox"
          aria-label={ariaLabel}
        >
          <div className="border-b border-wl-surface px-2 pb-2 pt-1.5">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-wl-ink-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, domain, industry…"
                className="w-full rounded-lg border border-wl-surface bg-wl-page py-2 pl-8 pr-3 text-sm text-wl-ink placeholder:text-wl-ink-muted/70 focus:border-wl-teal/40 focus:outline-none focus:ring-1 focus:ring-wl-teal/25"
                autoComplete="off"
              />
            </label>
          </div>
          <ul
            ref={listRef}
            className="max-h-64 overflow-y-auto py-1"
            role="presentation"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-wl-ink-muted">
                No clients match your search.
              </li>
            ) : (
              filtered.map((c) => {
                const active = c.id === value
                return (
                  <li key={c.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      data-active={active ? 'true' : undefined}
                      onClick={() => {
                        onChange(c.id)
                        setOpen(false)
                        setQuery('')
                      }}
                      className={cn(
                        'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition',
                        active
                          ? 'bg-wl-teal-soft'
                          : 'hover:bg-wl-page',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                          active
                            ? 'bg-wl-teal text-white'
                            : 'bg-wl-page text-wl-ink-muted',
                        )}
                        aria-hidden
                      >
                        {c.name
                          .split(' ')
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-wl-ink">
                            {c.name}
                          </span>
                          {active && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-wl-teal" aria-hidden />
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-wl-ink-muted">
                          {c.domain}
                        </span>
                        <span className="mt-1 inline-flex max-w-full truncate rounded-md bg-wl-page px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-wl-ink-muted">
                          {c.segment}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
