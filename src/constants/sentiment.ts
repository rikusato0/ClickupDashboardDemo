/**
 * Five-band sentiment scale (−1…+1). Higher = warmer tone; lower = more tension.
 * Emojis match the product legend (delighted → angry).
 */
export type SentLevel =
  | 'delighted'
  | 'satisfied'
  | 'neutral'
  | 'frustrated'
  | 'angry'

/** Y positions for emoji ticks (band centers on −1…+1). */
export const SENTIMENT_Y_TICK_VALUES = [-0.8, -0.4, 0, 0.4, 0.8] as const

/** Band boundaries for reference lines on line charts. */
export const SENTIMENT_BAND_EDGES = [-0.6, -0.2, 0.2, 0.6] as const

export function sentimentLevel(score: number): SentLevel {
  if (score >= 0.6) return 'delighted'
  if (score >= 0.2) return 'satisfied'
  if (score >= -0.2) return 'neutral'
  if (score >= -0.6) return 'frustrated'
  return 'angry'
}

export function sentimentYTickLabel(value: number): string {
  return SENT_STYLE[sentimentLevel(value)].emoji
}

export const SENT_STYLE: Record<
  SentLevel,
             {
               label: string
               emoji: string
               text: string
               bg: string
               border: string
               fill: string
             }
> = {
  delighted: {
    label: 'Delighted',
    emoji: '😄',
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    fill: '#10b981',
  },
  satisfied: {
    label: 'Satisfied',
    emoji: '🙂',
    text: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    fill: '#0d9488',
  },
  neutral: {
    label: 'Neutral',
    emoji: '😐',
    text: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    fill: '#64748b',
  },
  frustrated: {
    label: 'Frustrated',
    emoji: '😟',
    text: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    fill: '#ea580c',
  },
  angry: {
    label: 'Angry',
    emoji: '😡',
    text: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    fill: '#e11d48',
  },
}
