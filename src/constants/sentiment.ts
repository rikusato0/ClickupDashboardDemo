import { Angry, Frown, Meh, Smile } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Sentiment quantization. The transcript: client wants "happy / meh / sad /
 * frustrated" faces instead of raw numeric scores so reports are scannable
 * at a glance.
 */
export type SentLevel = 'happy' | 'meh' | 'sad' | 'frustrated'

export function sentimentLevel(score: number): SentLevel {
  if (score >= 0.4) return 'happy'
  if (score >= 0) return 'meh'
  if (score >= -0.4) return 'sad'
  return 'frustrated'
}

export const SENT_STYLE: Record<
  SentLevel,
  {
    Icon: LucideIcon
    label: string
    text: string
    bg: string
    border: string
    fill: string
  }
> = {
  happy: {
    Icon: Smile,
    label: 'Happy',
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    fill: '#10b981',
  },
  meh: {
    Icon: Meh,
    label: 'Meh',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    fill: '#f59e0b',
  },
  sad: {
    Icon: Frown,
    label: 'Sad',
    text: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    fill: '#fb923c',
  },
  frustrated: {
    Icon: Angry,
    label: 'Frustrated',
    text: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    fill: '#e11d48',
  },
}
