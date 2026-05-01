import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  getMockDashboardSnapshot,
  onboardingDetailsById,
  type OnboardingClient,
  type TaskType,
} from './data/mockDashboard'
import { BrandLogo } from './components/BrandLogo'
import { DateRangePicker } from './components/DateRangePicker'
import { NAV, type NavId } from './constants/nav'
import { cn } from './utils/cn'
import { PatternDrillModal } from './views/comms/PatternDrillModal'
import { SentimentDrillModal } from './views/sentiment/SentimentDrillModal'
import { OnboardingDetailModal } from './views/onboarding/OnboardingDetailModal'
import { useCommsPatternsData } from './hooks/useCommsPatternsData'
import { useSentimentData } from './hooks/useSentimentData'
import type { TimesheetsState } from './views/TimesheetsView'
import type { CommsState } from './views/CommsView'
import type { SentimentState } from './views/SentimentView'
import type { ProfilesState } from './views/ProfilesView'
import type { OnboardingState } from './views/OnboardingView'

const TimesheetsView = lazy(() => import('./views/TimesheetsView'))
const CommsView = lazy(() => import('./views/CommsView'))
const SentimentView = lazy(() => import('./views/SentimentView'))
const ProfilesView = lazy(() => import('./views/ProfilesView'))
const OnboardingView = lazy(() => import('./views/OnboardingView'))

function ViewFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-xs text-wl-ink-muted">
      Loading…
    </div>
  )
}

export default function App() {
  const snapshot = useMemo(() => getMockDashboardSnapshot(), [])
  const BASELINE_FROM = format(snapshot.dateRange.start, 'yyyy-MM-dd')
  const BASELINE_TO = format(snapshot.dateRange.end, 'yyyy-MM-dd')

  const [nav, setNav] = useState<NavId>('timesheets')
  const [dateFrom, setDateFrom] = useState(BASELINE_FROM)
  const [dateTo, setDateTo] = useState(BASELINE_TO)

  const [filterStaff, setFilterStaff] = useState<string[] | null>(null)
  const [filterClients, setFilterClients] = useState<string[] | null>(null)
  const [filterTaskTypes, setFilterTaskTypes] = useState<TaskType[] | null>(
    null,
  )
  const [openFilterId, setOpenFilterId] = useState<string | null>(null)
  const [tsSub, setTsSub] = useState<
    'overview' | 'by_client' | 'by_type' | 'by_staff' | 'export'
  >('overview')
  const [exportStaffIds, setExportStaffIds] = useState<string[] | null>(null)

  const [commsSub, setCommsSub] = useState<'patterns' | 'response' | 'email'>(
    'patterns',
  )
  const [patternsClientId, setPatternsClientId] = useState<string>('c1')
  const [patternDrillId, setPatternDrillId] = useState<string | null>(null)
  const [respStaffFilter, setRespStaffFilter] = useState<string[] | null>(null)
  const [respAlertDirection, setRespAlertDirection] = useState<'above' | 'below'>(
    'above',
  )
  const [respAlertThreshold, setRespAlertThreshold] = useState<number>(90)

  const [sentimentClientId, setSentimentClientId] = useState<string>('c4')
  const [sentimentDrill, setSentimentDrill] = useState<{
    clientId: string
    periodEnd: string
  } | null>(null)

  const [profileClientId, setProfileClientId] = useState<string>('c1')

  const [onboardingState, setOnboardingState] = useState<OnboardingClient[]>(
    () =>
      snapshot.onboardingClients.map((c) => ({
        ...c,
        steps: c.steps.map((s) => ({ ...s })),
      })),
  )
  const [onboardingDetailId, setOnboardingDetailId] = useState<string | null>(
    null,
  )

  const toggleOnboardingStep = (clientId: string, stepIndex: number) => {
    setOnboardingState((prev) =>
      prev.map((ob) => {
        if (ob.id !== clientId) return ob
        const steps = ob.steps.map((s, i) =>
          i === stepIndex ? { ...s, done: !s.done } : s,
        )
        const doneCount = steps.filter((s) => s.done).length
        const percentComplete = steps.length
          ? Math.round((doneCount / steps.length) * 100)
          : ob.percentComplete
        return { ...ob, steps, percentComplete }
      }),
    )
  }

  // Drill-modal data lookups happen here so the modals stay open even when
  // the user navigates away from the originating view (matches original
  // top-level rendering).
  const { patternDrill } = useCommsPatternsData({
    patternsClientId,
    patternDrillId,
  })
  const { sentimentDrillData } = useSentimentData({
    sentimentClientId,
    sentimentDrill,
  })

  const onboardingDetail =
    onboardingDetailId != null
      ? onboardingDetailsById[onboardingDetailId]
      : undefined
  const onboardingDetailClient =
    onboardingDetailId != null
      ? onboardingState.find((o) => o.id === onboardingDetailId)
      : undefined

  // Esc-to-close handlers live with the state owners (App), matching the
  // original effect placement.
  useEffect(() => {
    if (!onboardingDetailId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOnboardingDetailId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onboardingDetailId])

  useEffect(() => {
    if (!patternDrillId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPatternDrillId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [patternDrillId])

  useEffect(() => {
    if (!sentimentDrill) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSentimentDrill(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sentimentDrill])

  const timesheetsState: TimesheetsState = {
    filterStaff,
    setFilterStaff,
    filterClients,
    setFilterClients,
    filterTaskTypes,
    setFilterTaskTypes,
    openFilterId,
    setOpenFilterId,
    tsSub,
    setTsSub,
    exportStaffIds,
    setExportStaffIds,
  }

  const commsState: CommsState = {
    commsSub,
    setCommsSub,
    patternsClientId,
    setPatternsClientId,
    patternDrillId,
    setPatternDrillId,
    respStaffFilter,
    setRespStaffFilter,
    respAlertDirection,
    setRespAlertDirection,
    respAlertThreshold,
    setRespAlertThreshold,
  }

  const sentimentState: SentimentState = {
    sentimentClientId,
    setSentimentClientId,
    sentimentDrill,
    setSentimentDrill,
  }

  const profilesState: ProfilesState = {
    profileClientId,
    setProfileClientId,
  }

  const onboardingViewState: OnboardingState = {
    onboardingState,
    toggleOnboardingStep,
    onboardingDetailId,
    setOnboardingDetailId,
  }

  return (
    <div className="flex min-h-svh flex-col bg-wl-page text-wl-ink">
      <header className="sticky top-0 z-40 border-b border-wl-surface bg-wl-card">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-4 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex shrink-0 items-center gap-3">
            <BrandLogo className="h-10 w-10 shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="font-display text-[13px] font-bold tracking-[0.12em] text-wl-teal">
                WHITE LOTUS
              </p>
              <p className="-mt-0.5 text-[11px] font-semibold tracking-[0.18em] text-wl-ink-muted">
                BOOKKEEPING
              </p>
            </div>
          </div>
          <span className="hidden h-8 w-px bg-wl-surface sm:block" aria-hidden />
          <div className="min-w-0 flex-1 basis-[min(100%,18rem)] sm:basis-auto">
            <h1 className="text-base font-semibold tracking-tight text-wl-ink sm:text-[17px]">
              Metrics — White Lotus Bookkeeping
            </h1>
            <p className="mt-0.5 text-xs leading-snug text-wl-ink-muted">
              Time, communications, and onboarding metrics in one place.
            </p>
          </div>
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => {
              setDateFrom(f)
              setDateTo(t)
            }}
            baselineFrom={BASELINE_FROM}
            baselineTo={BASELINE_TO}
            className="ml-auto w-full min-w-0 shrink-0 sm:w-auto"
          />
        </div>
        <div className="border-t border-wl-surface bg-wl-card px-4 sm:px-6 lg:px-10">
          <nav className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Main">
            {NAV.map((item) => {
              const Icon = item.icon
              const active = nav === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setNav(item.id)
                    setOpenFilterId(null)
                  }}
                  className={cn(
                    'flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
                    active
                      ? 'border-wl-teal text-wl-teal'
                      : 'border-transparent text-wl-ink-muted hover:text-wl-ink',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10">
        <Suspense fallback={<ViewFallback />}>
          {nav === 'timesheets' && (
            <TimesheetsView
              dateFrom={dateFrom}
              dateTo={dateTo}
              state={timesheetsState}
            />
          )}
          {nav === 'comms' && <CommsView state={commsState} />}
          {nav === 'sentiment' && <SentimentView state={sentimentState} />}
          {nav === 'profiles' && <ProfilesView state={profilesState} />}
          {nav === 'onboarding' && (
            <OnboardingView state={onboardingViewState} />
          )}
        </Suspense>
      </main>

      {patternDrillId != null && patternDrill && (
        <PatternDrillModal
          drill={patternDrill}
          onClose={() => setPatternDrillId(null)}
        />
      )}
      {sentimentDrill != null && sentimentDrillData && (
        <SentimentDrillModal
          data={sentimentDrillData}
          onClose={() => setSentimentDrill(null)}
        />
      )}
      {onboardingDetailId != null && onboardingDetail && (
        <OnboardingDetailModal
          detail={onboardingDetail}
          client={onboardingDetailClient}
          onClose={() => setOnboardingDetailId(null)}
        />
      )}
    </div>
  )
}