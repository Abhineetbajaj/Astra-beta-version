export const SCORE_TIER_OPENING: Record<'high' | 'medium' | 'low', string[]> = {
  high: [
    'This is an easy match on paper — the kind of compatibility that shows up as fewer small frictions, not fireworks.',
    'A strong baseline. Most of the classical friction points are simply absent here.',
  ],
  medium: [
    'A workable match with a few real friction points — nothing disqualifying, but worth naming rather than ignoring.',
    'Mixed signals: genuine strengths alongside a couple of classical mismatches that are worth talking through.',
  ],
  low: [
    'The classical indicators suggest real friction here — not fatal, but this pairing will take more deliberate effort than most.',
    'Several of the harder compatibility markers are present. That’s information, not a verdict.',
  ],
}

export const BHAKOOT_NOTE: Record<'full' | 'zero', string> = {
  full: 'Your Moon signs sit in an easy relationship to each other — emotional pacing tends to match without much negotiation.',
  zero: 'Your Moon signs sit in one of the classically tense positions — you likely process things on different timelines, which is manageable once named.',
}

export const GANA_NOTE: Record<'same' | 'adjacent' | 'opposite', string> = {
  same: 'You share a temperament category — similar instincts about pace and directness.',
  adjacent: 'Your temperaments are adjacent rather than identical — different enough to balance, close enough not to clash.',
  opposite: 'Your temperaments sit at opposite ends of the classical spectrum — likely your biggest real adjustment as a pair.',
}

export const NADI_NOTE: Record<'same' | 'different', string> = {
  same: 'Same Nadi group — classically the single biggest flag in this system. Worth being deliberate about health and vitality topics as a pair, not a reason for alarm on its own.',
  different: 'Different Nadi groups — no flag here, which classically matters more than any single strong point.',
}

export const CLOSING_LINES = [
  'None of this predicts the relationship — it describes a starting terrain.',
  'Compatibility scores describe tendencies, not outcomes. What you both do with them is the actual relationship.',
  'Treat this as a conversation starter, not a scorecard to win.',
] as const
