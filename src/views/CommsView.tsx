import { CommsSubTabs, type CommsSub } from '../components/CommsSubTabs'
import { PatternsTab } from './comms/PatternsTab'
import { ResponseTab } from './comms/ResponseTab'
import { EmailTab } from './comms/EmailTab'

export type CommsState = {
  commsSub: CommsSub
  setCommsSub: (next: CommsSub) => void
  patternsClientId: string
  setPatternsClientId: (next: string) => void
  patternDrillId: string | null
  setPatternDrillId: (next: string | null) => void
  respStaffFilter: string[] | null
  setRespStaffFilter: (next: string[] | null) => void
  respAlertDirection: 'above' | 'below'
  setRespAlertDirection: (next: 'above' | 'below') => void
  respAlertThreshold: number
  setRespAlertThreshold: (next: number) => void
}

export default function CommsView({ state }: { state: CommsState }) {
  const {
    commsSub,
    setCommsSub,
    patternsClientId,
    setPatternsClientId,
    setPatternDrillId,
    respStaffFilter,
    setRespStaffFilter,
    respAlertDirection,
    setRespAlertDirection,
    respAlertThreshold,
    setRespAlertThreshold,
  } = state

  return (
    <div className="space-y-6">
      <CommsSubTabs value={commsSub} onChange={setCommsSub} />
      {commsSub === 'patterns' && (
        <PatternsTab
          patternsClientId={patternsClientId}
          setPatternsClientId={setPatternsClientId}
          onOpenDrill={setPatternDrillId}
        />
      )}
      {commsSub === 'response' && (
        <ResponseTab
          respStaffFilter={respStaffFilter}
          setRespStaffFilter={setRespStaffFilter}
          respAlertDirection={respAlertDirection}
          setRespAlertDirection={setRespAlertDirection}
          respAlertThreshold={respAlertThreshold}
          setRespAlertThreshold={setRespAlertThreshold}
        />
      )}
      {commsSub === 'email' && <EmailTab />}
    </div>
  )
}
