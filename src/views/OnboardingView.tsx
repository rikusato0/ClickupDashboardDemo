import { ChevronRight } from 'lucide-react'
import { staff, type OnboardingClient } from '../data/mockDashboard'
import { Card } from '../components/Card'
import { cn } from '../utils/cn'
import { fmtInt } from '../utils/format'

export type OnboardingState = {
  onboardingState: OnboardingClient[]
  toggleOnboardingStep: (clientId: string, stepIndex: number) => void
  onboardingDetailId: string | null
  setOnboardingDetailId: (next: string | null) => void
}

export default function OnboardingView({
  state,
}: {
  state: OnboardingState
}) {
  const {
    onboardingState,
    toggleOnboardingStep,
    setOnboardingDetailId,
  } = state

  return (
    <div className="space-y-6">
      <Card
        title="Client onboarding"
        subtitle="Stages, owners, and checklist progress."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {onboardingState.map((ob) => {
            const owner = staff.find((x) => x.id === ob.ownerStaffId)
            return (
              <div
                key={ob.id}
                className="flex flex-col rounded-2xl border border-wl-surface bg-wl-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-wl-ink">
                      {ob.clientName}
                    </h4>
                    <p className="mt-1 text-xs text-wl-ink-muted">
                      Owner: {owner?.name} · Target: {ob.targetGoLive}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-wl-teal-soft px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-wl-teal-muted">
                    {ob.stage}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-wl-ink-muted">
                    <span>Progress</span>
                    <span className="font-semibold text-wl-ink">
                      {fmtInt(ob.percentComplete)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-wl-surface">
                    <div
                      className="h-full rounded-full bg-wl-teal"
                      style={{ width: `${ob.percentComplete}%` }}
                    />
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-wl-ink">
                  {ob.steps.map((step, stepIndex) => (
                    <li key={`${ob.id}-step-${stepIndex}`}>
                      <button
                        type="button"
                        onClick={() =>
                          toggleOnboardingStep(ob.id, stepIndex)
                        }
                        className="flex w-full items-start gap-2 rounded-xl py-0.5 text-left transition hover:bg-wl-teal-soft/60"
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px]',
                            step.done
                              ? 'border-wl-teal bg-wl-teal text-white'
                              : 'border-wl-surface bg-wl-card text-wl-ink-muted',
                          )}
                          aria-hidden
                        >
                          {step.done ? '✓' : ''}
                        </span>
                        <span>
                          {step.label}
                          {step.owner && (
                            <span className="ml-1 text-xs text-wl-ink-muted">
                              ({step.owner})
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setOnboardingDetailId(ob.id)}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-wl-teal hover:text-wl-teal-muted"
                >
                  Open detail
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
