import { useEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { fmtInt } from '../utils/format'

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

type Props<T extends string> = {
  menuId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  icon: LucideIcon
  label: string
  options: { id: T; label: string }[]
  selected: T[] | null
  onChange: (v: T[] | null) => void
  searchPlaceholder?: string
}

export function FilterMultiSelect<T extends string>({
  menuId,
  isOpen,
  onOpenChange,
  icon: Icon,
  label,
  options,
  selected,
  onChange,
  searchPlaceholder = 'Filter list…',
}: Props<T>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const t = window.setTimeout(() => searchRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setQuery('')
        onOpenChange(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [isOpen, onOpenChange])

  const allIds = useMemo(() => options.map((x) => x.id), [options])
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const summary =
    selected === null
      ? 'All'
      : selected.length === 0
        ? 'None match'
        : selected.length <= 2
          ? options
              .filter((o) => selected.includes(o.id))
              .map((o) => o.label)
              .join(', ')
          : `${fmtInt(selected.length)} selected`

  return (
    <div ref={rootRef} className="relative" data-filter-menu={menuId}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => {
          if (isOpen) {
            setQuery('')
            onOpenChange(false)
          } else {
            setQuery('')
            onOpenChange(true)
          }
        }}
        className="flex items-center gap-2 rounded-full border-2 border-wl-ink/15 bg-wl-surface/30 px-3 py-2 text-left text-xs text-wl-ink hover:bg-wl-surface/50"
      >
        <Icon className="h-3.5 w-3.5 text-wl-teal-muted" />
        <span className="font-semibold uppercase tracking-wide text-wl-ink-muted">
          {label}:
        </span>
        <span className="max-w-[140px] truncate">{summary}</span>
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[240px] max-w-[min(100vw-2rem,20rem)] rounded-2xl border border-wl-surface/60 bg-wl-card p-2 shadow-xl">
          <input
            ref={searchRef}
            type="search"
            autoComplete="off"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2 w-full rounded-xl border border-wl-surface/60 bg-wl-page px-3 py-2 text-xs text-wl-ink outline-none ring-wl-teal-muted/30 placeholder:text-wl-ink-muted/70 focus:ring-2"
          />
          <div className="mb-2 flex gap-2 border-b border-wl-surface/40 pb-2">
            <button
              type="button"
              className="text-[11px] font-semibold uppercase text-wl-teal-muted hover:underline"
              onClick={() => onChange(null)}
            >
              All
            </button>
            <button
              type="button"
              className="text-[11px] font-semibold uppercase text-wl-ink-muted hover:underline"
              onClick={() => onChange([])}
            >
              None
            </button>
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-wl-ink-muted">
                No matches
              </p>
            ) : (
              filteredOptions.map((o) => {
                const checked =
                  selected === null ? true : selected.includes(o.id)
                return (
                  <label
                    key={o.id}
                    className="flex cursor-pointer items-center gap-2 rounded-full px-2 py-1.5 text-xs hover:bg-wl-teal/10"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-wl-surface text-wl-teal-muted"
                      checked={checked}
                      onChange={() => {
                        if (selected === null) {
                          onChange(allIds.filter((id) => id !== o.id))
                        } else if (selected.includes(o.id)) {
                          const next = selected.filter((id) => id !== o.id)
                          onChange(next.length === 0 ? [] : next)
                        } else {
                          const next = [...selected, o.id]
                          onChange(
                            next.length === allIds.length ? null : next,
                          )
                        }
                      }}
                    />
                    <span className={cn(!checked && 'text-wl-ink-muted')}>
                      {o.label}
                    </span>
                  </label>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
