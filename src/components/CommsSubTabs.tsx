export type CommsSub = 'patterns' | 'response' | 'email'

export const COMMS_SUB_TABS: ReadonlyArray<readonly [CommsSub, string]> = [
  ['patterns', 'Communications patterns'],
  ['response', 'Response time'],
  ['email', 'Email volume'],
] as const
