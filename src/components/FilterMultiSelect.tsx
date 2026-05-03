import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { LucideIcon } from 'lucide-react'
import { fmtInt } from '../utils/format'

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

type MenuAlign = { x: 'left' | 'right'; y: 'below' | 'above' }

const MARGIN = 12
const MENU_MIN_W = 240
/** Search + actions + max list body (max-h-56) */
const MENU_EST_H = 300

function computeMenuAlign(trigger: DOMRect): MenuAlign {
  let x: MenuAlign['x'] = 'left'
  if (trigger.left + MENU_MIN_W > window.innerWidth - MARGIN) {
    x = 'right'
  }
  let y: MenuAlign['y'] = 'below'
  if (
    trigger.bottom + MENU_EST_H > window.innerHeight - MARGIN &&
    trigger.top > MENU_EST_H + MARGIN
  ) {
    y = 'above'
  }
  return { x, y }
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
  /** Merged onto the trigger button (e.g. fixed height for toolbar rows) */
  buttonClassName?: string
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
  buttonClassName,
}: Props<T>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [menuAlign, setMenuAlign] = useState<MenuAlign>({
    x: 'left',
    y: 'below',
  })

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

  useLayoutEffect(() => {
    if (!isOpen || !rootRef.current) return

    const update = () => {
      const el = rootRef.current
      if (!el) return
      setMenuAlign(computeMenuAlign(el.getBoundingClientRect()))
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [isOpen, query, options.length])

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
        className={cn(
          'flex items-center gap-2 rounded-lg border border-wl-surface bg-wl-card px-3 py-2 text-left text-xs text-wl-ink shadow-sm transition hover:border-wl-teal/40',
          buttonClassName,
        )}
      >
        <Icon className="h-3.5 w-3.5 text-wl-ink-muted" />
        <span className="font-semibold uppercase tracking-wide text-wl-ink-muted">
          {label}:
        </span>
        <span className="max-w-[140px] truncate font-medium text-wl-ink">{summary}</span>
      </button>
      {isOpen && (
        <div
          className={cn(
            'absolute z-30 min-w-[240px] max-w-[min(100vw-2rem,20rem)] rounded-xl border border-wl-surface bg-wl-card p-2 shadow-xl shadow-slate-900/10',
            menuAlign.y === 'below' ? 'top-full mt-1' : 'bottom-full mb-1',
            menuAlign.x === 'left' ? 'left-0' : 'right-0',
          )}
        >
          <input
            ref={searchRef}
            type="search"
            autoComplete="off"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2 w-full rounded-lg border border-wl-surface bg-wl-page px-3 py-2 text-xs text-wl-ink outline-none ring-wl-teal/30 placeholder:text-wl-ink-muted/70 focus:ring-2"
          />
          <div className="mb-2 flex gap-3 border-b border-wl-surface pb-2">
            <button
              type="button"
              className="text-[11px] font-semibold text-wl-teal hover:text-wl-teal-muted hover:underline"
              onClick={() => onChange(null)}
            >
              All
            </button>
            <button
              type="button"
              className="text-[11px] font-semibold text-wl-ink-muted hover:text-wl-ink hover:underline"
              onClick={() => onChange([])}
            >
              None
            </button>
          </div>
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
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
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-wl-teal-soft"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-wl-surface text-wl-teal"
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
