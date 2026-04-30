import { cn } from '../utils/cn'

export type CommsSub = 'patterns' | 'response' | 'email'

const TABS: ReadonlyArray<readonly [CommsSub, string]> = [
  ['patterns', 'Communications patterns'],
  ['response', 'Response time'],
  ['email', 'Email volume'],
] as const

export function CommsSubTabs({
  value,
  onChange,
}: {
  value: CommsSub
  onChange: (next: CommsSub) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'rounded-md px-3.5 py-1.5 text-sm font-medium leading-[1.23rem] transition-colors',
            value === id
              ? 'bg-wl-teal-soft text-wl-teal-muted'
              : 'text-wl-ink-muted hover:bg-wl-surface/50 hover:text-wl-ink',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
