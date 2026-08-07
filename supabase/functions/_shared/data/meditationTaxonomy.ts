// Deno copy of the NEED_TAGS/MANTRA_PLANETS content in src/data/meditationCategories.ts (minus
// the lucide-react icon fields, frontend-only) — keep in sync; do not diverge silently.

export const NEED_TAGS: { key: string; label: string; planetContext: string }[] = [
  { key: 'stress-anxiety', label: 'Stress & anxiety', planetContext: 'Moon' },
  { key: 'career-doubt', label: 'Career doubt', planetContext: 'Saturn' },
  { key: 'financial-blocks', label: 'Financial blocks', planetContext: 'Venus/Jupiter' },
  { key: 'relationship-healing', label: 'Relationship healing', planetContext: 'Venus' },
  { key: 'grief-loss', label: 'Grief & loss', planetContext: 'Ketu' },
  { key: 'confidence', label: 'Confidence', planetContext: 'Sun' },
  { key: 'sleep', label: 'Sleep', planetContext: 'Moon' },
]

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
