import { useState } from 'react'
import { Bell, Users } from 'lucide-react'
import { COMMS_SUB_TABS, type CommsSub } from '../components/CommsSubTabs'
import { DateRangePicker } from '../components/DateRangePicker'
import { ClientPicker } from '../components/ClientPicker'
import { FilterMultiSelect } from '../components/FilterMultiSelect'
import { clients, staff } from '../data/mockDashboard'
import { cn } from '../utils/cn'
import { PatternsTab } from './comms/PatternsTab'
import { ResponseTab } from './comms/ResponseTab'
import { EmailTab } from './comms/EmailTab'
import { ResponseAlertSettingsDialog } from './comms/ResponseAlertSettingsDialog'

export type CommsState = {
  commsSub: CommsSub
  setCommsSub: (next: CommsSub) => void
  commsPeriodFrom: string
  commsPeriodTo: string
  setCommsPeriod: (from: string, to: string) => void
  commsPeriodBaselineFrom: string
  commsPeriodBaselineTo: string
  commsFilterClients: string[] | null
  setCommsFilterClients: (next: string[] | null) => void
  commsFilterStaff: string[] | null
  setCommsFilterStaff: (next: string[] | null) => void
  commsOpenFilterId: string | null
  setCommsOpenFilterId: (next: string | null) => void
  patternDrillId: string | null
  setPatternDrillId: (next: string | null) => void
  respAlertDirection: 'above' | 'below'
  setRespAlertDirection: (next: 'above' | 'below') => void
  respAlertThreshold: number
  setRespAlertThreshold: (next: number) => void
}

export default function CommsView({ state }: { state: CommsState }) {
  const {
    commsSub,
    setCommsSub,
    commsPeriodFrom,
    commsPeriodTo,
    setCommsPeriod,
    commsPeriodBaselineFrom,
    commsPeriodBaselineTo,
    commsFilterClients,
    setCommsFilterClients,
    commsFilterStaff,
    setCommsFilterStaff,
    commsOpenFilterId,
    setCommsOpenFilterId,
    setPatternDrillId,
    respAlertDirection,
    setRespAlertDirection,
    respAlertThreshold,
    setRespAlertThreshold,
  } = state

  const filterProps = {
    commsPeriodFrom,
    commsPeriodTo,
    commsFilterClients,
    commsFilterStaff,
  }

  const [respAlertDialogOpen, setRespAlertDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap gap-2">
          {COMMS_SUB_TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setCommsSub(id)}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-sm font-medium leading-[1.23rem] transition-colors',
                commsSub === id
                  ? 'bg-wl-teal-soft text-wl-teal-muted'
                  : 'text-wl-ink-muted hover:bg-wl-surface/50 hover:text-wl-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex w-full min-w-0 flex-col flex-wrap gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          {commsSub === 'response' && (
            <button
              type="button"
              onClick={() => setRespAlertDialogOpen(true)}
              className="inline-flex h-10 min-h-10 shrink-0 items-center gap-2 rounded-lg border border-wl-surface bg-wl-card px-4 py-0 text-sm font-semibold text-wl-ink shadow-sm transition hover:border-wl-teal/40 focus:outline-none focus:ring-2 focus:ring-wl-teal/25"
            >
              <Bell className="h-4 w-4 shrink-0 text-wl-orange" aria-hidden />
              Alert settings
            </button>
          )}
          <DateRangePicker
            from={commsPeriodFrom}
            to={commsPeriodTo}
            onChange={setCommsPeriod}
            baselineFrom={commsPeriodBaselineFrom}
            baselineTo={commsPeriodBaselineTo}
            compact
            className="w-full min-w-0 sm:w-auto"
          />
          <FilterMultiSelect
            menuId="comms-staff"
            isOpen={commsOpenFilterId === 'staff'}
            onOpenChange={(open) =>
              setCommsOpenFilterId(open ? 'staff' : null)
            }
            icon={Users}
            label="Staff"
            searchPlaceholder="Search staff…"
            options={staff.map((s) => ({ id: s.id, label: s.name }))}
            selected={commsFilterStaff}
            onChange={setCommsFilterStaff}
            buttonClassName="h-10 min-h-10 shrink-0 py-0 text-sm"
          />
          <ClientPicker
            mode="multi"
            clients={clients}
            menuId="comms-clients"
            isOpen={commsOpenFilterId === 'clients'}
            onOpenChange={(open) =>
              setCommsOpenFilterId(open ? 'clients' : null)
            }
            selected={commsFilterClients}
            onChange={setCommsFilterClients}
            buttonClassName="h-10 min-h-10 shrink-0 py-0 text-sm"
          />
        </div>
      </div>

      {commsSub === 'patterns' && (
        <PatternsTab
          {...filterProps}
          onOpenDrill={setPatternDrillId}
        />
      )}
      {commsSub === 'response' && <ResponseTab {...filterProps} />}
      {commsSub === 'email' && <EmailTab {...filterProps} />}

      {commsSub === 'response' && (
        <ResponseAlertSettingsDialog
          open={respAlertDialogOpen}
          onClose={() => setRespAlertDialogOpen(false)}
          direction={respAlertDirection}
          onDirectionChange={setRespAlertDirection}
          thresholdMinutes={respAlertThreshold}
          onThresholdChange={setRespAlertThreshold}
        />
      )}
    </div>
  )
}
