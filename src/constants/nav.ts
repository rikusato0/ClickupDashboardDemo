import { BookUser, Clock, HeartPulse, Inbox, Rocket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavId =
  | 'timesheets'
  | 'comms'
  | 'sentiment'
  | 'profiles'
  | 'onboarding'

export const NAV: { id: NavId; label: string; icon: LucideIcon }[] = [
  { id: 'timesheets', label: 'Timesheets', icon: Clock },
  { id: 'comms', label: 'Communications analysis', icon: Inbox },
  { id: 'sentiment', label: 'Client sentiment', icon: HeartPulse },
  { id: 'profiles', label: 'Client profiles', icon: BookUser },
  { id: 'onboarding', label: 'Client onboarding', icon: Rocket },
]
