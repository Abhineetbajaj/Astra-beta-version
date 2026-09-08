// Static taxonomy for the "Listen" section — fixed at 5 categories with no user data behind them,
// so this is a plain array (like RASHIS/astrologerPersonas) rather than a DB lookup table.

import type { LucideIcon } from 'lucide-react'
import { Sparkles, CalendarDays, Moon, HeartHandshake, Music4 } from 'lucide-react'

export type MeditationCategory = 'today' | 'weekly' | 'panchang' | 'need' | 'mantra'

export interface MeditationCategoryInfo {
  key: MeditationCategory
  label: string
  icon: LucideIcon
  displayOrder: number
}

export const MEDITATION_CATEGORIES: MeditationCategoryInfo[] = [
  { key: 'today', label: 'For You Today', icon: Sparkles, displayOrder: 1 },
  { key: 'weekly', label: "This Week's Ritual", icon: Moon, displayOrder: 2 },
  { key: 'panchang', label: 'Panchang Calendar', icon: CalendarDays, displayOrder: 3 },
  { key: 'need', label: 'Browse by Need', icon: HeartHandshake, displayOrder: 4 },
  { key: 'mantra', label: 'Graha Mantras', icon: Music4, displayOrder: 5 },
]

export interface NeedTagInfo {
  key: string
  label: string
  /** First-person reframe for the "what do you need right now?" interaction — purely a display
      string layered over the same real key/routing, so it can read the way a person would actually
      describe themselves without touching what the tag means or does. Optional: falls back to
      `label` wherever it isn't set. */
  humanLabel?: string
  /** The planetary framing this need is written through, per the spec. */
  planetContext: string
}

export const NEED_TAGS: NeedTagInfo[] = [
  { key: 'stress-anxiety', label: 'Stress & anxiety', humanLabel: "I'm feeling anxious", planetContext: 'Moon' },
  { key: 'career-doubt', label: 'Career doubt', humanLabel: 'I feel stuck', planetContext: 'Saturn' },
  { key: 'financial-blocks', label: 'Financial blocks', humanLabel: "I'm worried about money", planetContext: 'Venus/Jupiter' },
  { key: 'relationship-healing', label: 'Relationship healing', humanLabel: 'My heart needs healing', planetContext: 'Venus' },
  { key: 'grief-loss', label: 'Grief & loss', humanLabel: "I'm grieving", planetContext: 'Ketu' },
  { key: 'confidence', label: 'Confidence', humanLabel: 'I need confidence', planetContext: 'Sun' },
  { key: 'sleep', label: 'Sleep', humanLabel: "I can't switch off", planetContext: 'Moon' },
]

/** The 9 grahas, in classical order, each with a one-line "when to use this" prompt for the mantra library. */
export const MANTRA_PLANETS: { planet: string; whenToUse: string }[] = [
  { planet: 'Sun', whenToUse: 'When you need confidence, visibility, or a sense of purpose.' },
  { planet: 'Moon', whenToUse: 'When your mind feels unsettled, or you need emotional steadiness.' },
  { planet: 'Mars', whenToUse: 'When you need courage, or to work through anger and conflict.' },
  { planet: 'Mercury', whenToUse: 'Before an important conversation, negotiation, or exam.' },
  { planet: 'Jupiter', whenToUse: 'When you need clarity, guidance, or a sense of expansion.' },
  { planet: 'Venus', whenToUse: 'For relationship healing, or reconnecting with beauty and ease.' },
  { planet: 'Saturn', whenToUse: 'During a difficult Saturn dasha or transit, or when patience is wearing thin.' },
  { planet: 'Rahu', whenToUse: 'When ambition or restlessness feels like it is running away with you.' },
  { planet: 'Ketu', whenToUse: 'During grief, loss, or a season that calls for letting go.' },
]
