import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { Building2, Check, Search } from 'lucide-react'
import type { Client } from '../data/mockDashboard'
import { cn } from '../utils/cn'
import { fmtInt } from '../utils/format'

function clientInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
}

type MenuAlign = { x: 'left' | 'right'; y: 'below' | 'above' }
const MARGIN = 12
const MENU_MIN_W = 260
const MENU_EST_H = 420

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

function filterClients(clients: Client[], q: string) {
  const s = q.trim().toLowerCase()
  if (!s) return clients
  return clients.filter(
    (c) =>
      c.name.toLowerCase().includes(s) ||
      c.domain.toLowerCase().includes(s) ||
      c.segment.toLowerCase().includes(s) ||
      c.engagementCode.toLowerCase().includes(s),
  )
}

/** Shared chrome so every tab’s picker looks identical. */
const triggerClassName = (open: boolean, extra?: string) =>
  cn(
    'flex w-full min-w-0 items-center gap-2 rounded-lg border border-wl-surface bg-wl-card px-3 py-0 text-left text-sm text-wl-ink shadow-sm transition',
    'h-10 min-h-10 hover:border-wl-teal/40 focus:outline-none focus:ring-2 focus:ring-wl-teal/25',
    open && 'border-wl-teal/50 ring-2 ring-wl-teal/20',
    extra,
  )

const PANEL_SHELL =
  'w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-xl border border-wl-surface bg-wl-card py-1 shadow-xl shadow-slate-900/10 sm:w-[22rem]'

const SEARCH_INPUT =
  'w-full rounded-lg border border-wl-surface bg-wl-page py-2 pl-8 pr-3 text-sm text-wl-ink placeholder:text-wl-ink-muted/70 focus:border-wl-teal/40 focus:outline-none focus:ring-1 focus:ring-wl-teal/25'

function ClientRowAvatar({
  label,
  active,
}: {
  label: string
  active: boolean
}) {
  return (
    <span
      className={cn(
        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
        active
          ? 'bg-wl-teal text-white'
          : 'bg-wl-page text-wl-ink-muted',
      )}
      aria-hidden
    >
      {label}
    </span>
  )
}

function ClientRowBody({
  client: c,
  dimmed,
  trailing,
}: {
  client: Client
  dimmed?: boolean
  trailing?: ReactNode
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            'truncate text-sm font-semibold text-wl-ink',
            dimmed && 'text-wl-ink-muted',
          )}
        >
          {c.name}
        </span>
        {trailing}
      </span>
      <span className="mt-0.5 block truncate text-[11px] text-wl-ink-muted">
        {c.domain}
      </span>
      <span className="mt-1 inline-flex max-w-full truncate rounded-md bg-wl-page px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-wl-ink-muted">
        {c.segment}
      </span>
    </span>
  )
}

export type ClientPickerSingleProps = {
  mode: 'single'
  clients: Client[]
  value: string | null
  onChange: (clientId: string | null) => void
  allowAllCompanies?: boolean
  className?: string
  'aria-label'?: string
}

export type ClientPickerMultiProps = {
  mode: 'multi'
  clients: Client[]
  menuId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selected: string[] | null
  onChange: (v: string[] | null) => void
  /** Applied to the outer wrapper (e.g. width in toolbars). */
  className?: string
  buttonClassName?: string
}

export type ClientPickerProps = ClientPickerSingleProps | ClientPickerMultiProps

export function ClientPicker(props: ClientPickerProps) {
  if (props.mode === 'multi') {
    return <ClientPickerMulti {...props} />
  }
  return <ClientPickerSingle {...props} />
}

function PickerTriggerButton({
  open,
  onClick,
  summary,
  ariaProps,
  buttonClassName,
}: {
  open: boolean
  onClick: () => void
  summary: string
  ariaProps: { 'aria-label'?: string; 'aria-expanded': boolean }
  buttonClassName?: string
}) {
  return (
    <button
      type="button"
      aria-haspopup="listbox"
      {...ariaProps}
      onClick={onClick}
      className={triggerClassName(open, buttonClassName)}
    >
      <Building2 className="h-3.5 w-3.5 shrink-0 text-wl-ink-muted" aria-hidden />
      <span className="shrink-0 font-semibold uppercase tracking-wide text-wl-ink-muted">
        Client:
      </span>
      <span className="min-w-0 max-w-[min(100%,12rem)] flex-1 truncate font-medium text-wl-ink sm:max-w-[14rem]">
        {summary}
      </span>
    </button>
  )
}

function SearchField({
  query,
  onQuery,
  inputRef,
}: {
  query: string
  onQuery: (q: string) => void
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="border-b border-wl-surface px-2 pb-2 pt-1.5">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-wl-ink-muted" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search name, domain, industry…"
          className={SEARCH_INPUT}
          autoComplete="off"
        />
      </label>
    </div>
  )
}

function ClientPickerSingle({
  clients,
  value,
  onChange,
  allowAllCompanies = false,
  className,
  'aria-label': ariaLabel = 'Client',
}: ClientPickerSingleProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = value == null ? null : clients.find((c) => c.id === value)

  const filtered = useMemo(
    () => filterClients(clients, query),
    [clients, query],
  )

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
    if (!open) return
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, filtered, value])

  const labelText =
    value === null && allowAllCompanies
      ? 'All companies'
      : (selected?.name ?? 'Select…')

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <PickerTriggerButton
        open={open}
        onClick={() => {
          setOpen((o) => !o)
          if (!open) setQuery('')
        }}
        summary={labelText}
        ariaProps={{
          'aria-label': ariaLabel,
          'aria-expanded': open,
        }}
      />

      {open && (
        <div
          className={cn(
            'absolute right-0 z-50 mt-2',
            PANEL_SHELL,
          )}
          role="listbox"
          aria-label={ariaLabel}
        >
          <SearchField query={query} onQuery={setQuery} />
          <ul
            ref={listRef}
            className="max-h-64 overflow-y-auto py-1"
            role="presentation"
          >
            {allowAllCompanies && (
              <li role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === null}
                  data-active={value === null ? 'true' : undefined}
                  onClick={() => {
                    onChange(null)
                    setOpen(false)
                    setQuery('')
                  }}
                  className={cn(
                    'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition',
                    value === null ? 'bg-wl-teal-soft' : 'hover:bg-wl-page',
                  )}
                >
                  <ClientRowAvatar label="All" active={value === null} />
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="text-sm font-semibold text-wl-ink">
                      All companies
                    </span>
                    {value === null && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-wl-teal" aria-hidden />
                    )}
                  </span>
                </button>
              </li>
            )}
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
                        active ? 'bg-wl-teal-soft' : 'hover:bg-wl-page',
                      )}
                    >
                      <ClientRowAvatar
                        label={clientInitials(c.name)}
                        active={active}
                      />
                      <ClientRowBody
                        client={c}
                        trailing={
                          active ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-wl-teal" aria-hidden />
                          ) : undefined
                        }
                      />
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

function ClientPickerMulti({
  clients,
  menuId,
  isOpen,
  onOpenChange,
  selected,
  onChange,
  className,
  buttonClassName,
}: ClientPickerMultiProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [menuAlign, setMenuAlign] = useState<MenuAlign>({
    x: 'left',
    y: 'below',
  })

  const allIds = useMemo(() => clients.map((c) => c.id), [clients])

  const filtered = useMemo(() => filterClients(clients, query), [clients, query])

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
  }, [isOpen, query, clients.length])

  const summary =
    selected === null
      ? 'All companies'
      : selected.length === 0
        ? 'None selected'
        : selected.length <= 2
          ? clients
              .filter((c) => selected.includes(c.id))
              .map((c) => c.name)
              .join(', ')
          : `${fmtInt(selected.length)} selected`

  return (
    <div ref={rootRef} className={cn('relative', className)} data-filter-menu={menuId}>
      <PickerTriggerButton
        open={isOpen}
        onClick={() => {
          if (isOpen) {
            setQuery('')
            onOpenChange(false)
          } else {
            setQuery('')
            onOpenChange(true)
          }
        }}
        summary={summary}
        ariaProps={{ 'aria-expanded': isOpen }}
        buttonClassName={buttonClassName}
      />
      {isOpen && (
        <div
          className={cn(
            'absolute z-30',
            PANEL_SHELL,
            menuAlign.y === 'below' ? 'top-full mt-1' : 'bottom-full mb-1',
            menuAlign.x === 'left' ? 'left-0' : 'right-0',
          )}
        >
          <SearchField
            query={query}
            onQuery={setQuery}
            inputRef={searchRef}
          />
          <div className="flex gap-3 border-b border-wl-surface px-3 py-2">
            <button
              type="button"
              className="text-[11px] font-semibold text-wl-teal hover:text-wl-teal-muted hover:underline"
              onClick={() => onChange(null)}
            >
              Select all
            </button>
            <button
              type="button"
              className="text-[11px] font-semibold text-wl-ink-muted hover:text-wl-ink hover:underline"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          </div>
          <div className="max-h-64 space-y-0.5 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-wl-ink-muted">
                No clients match your search.
              </p>
            ) : (
              filtered.map((c) => {
                const checked =
                  selected === null ? true : selected.includes(c.id)
                return (
                  <label
                    key={c.id}
                    className={cn(
                      'flex w-full cursor-pointer items-start gap-2.5 px-3 py-2.5 transition',
                      checked ? 'bg-wl-teal-soft/60' : 'hover:bg-wl-page',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1.5 shrink-0 rounded border-wl-surface text-wl-teal"
                      checked={checked}
                      onChange={() => {
                        if (selected === null) {
                          onChange(allIds.filter((id) => id !== c.id))
                        } else if (selected.includes(c.id)) {
                          const next = selected.filter((id) => id !== c.id)
                          onChange(next.length === 0 ? [] : next)
                        } else {
                          const next = [...selected, c.id]
                          onChange(
                            next.length === allIds.length ? null : next,
                          )
                        }
                      }}
                    />
                    <ClientRowAvatar
                      label={clientInitials(c.name)}
                      active={checked}
                    />
                    <ClientRowBody client={c} dimmed={!checked} />
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
