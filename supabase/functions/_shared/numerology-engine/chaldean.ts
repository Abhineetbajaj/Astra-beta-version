// Deno copy of src/numerology-engine/chaldean.ts — keep in sync; do not diverge silently.

import { CHALDEAN_LETTER_VALUES } from './letterValues.ts'
import { isMasterNumber, reduceToSingleDigitOrMaster } from './reduction.ts'
import type { NumberResult } from './types.ts'

export interface CompoundNumberMeaning {
  compound: number
  title: string
  summary: string
}

export const CHALDEAN_COMPOUND_MEANINGS: Record<number, CompoundNumberMeaning> = {
  10: { compound: 10, title: 'The Wheel of Fortune', summary: 'Independence and self-made gain, with fortune that rises and falls on the choices you make.' },
  11: { compound: 11, title: 'The Warning', summary: "A caution to stay alert — hidden risk from others' actions, best navigated with intuition rather than force." },
  12: { compound: 12, title: 'The Sacrifice', summary: 'Effort given on behalf of others that may not be returned in kind — know what you\'re trading before you trade it.' },
  13: { compound: 13, title: 'Upheaval and Rebuild', summary: 'Not unlucky itself, but demands the old be dismantled before anything new can be built — resisted change causes more damage than the change itself.' },
  14: { compound: 14, title: 'Movement', summary: 'Change, travel, and sudden shifts — adaptability is the actual skill this number is testing.' },
  15: { compound: 15, title: 'The Magnetic Mind', summary: 'Charisma and depth of thought, with a caution against using either purely for material gain.' },
  16: { compound: 16, title: 'The Shattered Tower', summary: 'Unexpected upheaval to plans built on shaky ground — humbling, but a real rebuild follows.' },
  17: { compound: 17, title: 'The Star', summary: 'Struggle met with quiet spiritual strength, leading to a success that actually lasts.' },
  18: { compound: 18, title: 'Discord', summary: 'A tendency toward conflict or opposition — success comes from persistence, not from winning every argument.' },
  19: { compound: 19, title: 'The Sun', summary: 'One of the most fortunate compounds — happiness, recognition, and success that reflects real effort.' },
  20: { compound: 20, title: 'The Awakening', summary: 'A call to act on something significant — the risk is moving too fast before the moment is actually ready.' },
  21: { compound: 21, title: 'The Crown', summary: 'Advancement and reward that arrive after patience — elevation earned, not handed over.' },
  22: { compound: 22, title: 'The Warning of Delusion', summary: 'Big vision without grounded discipline collapses under its own weight — build the foundation before the tower.' },
  23: { compound: 23, title: 'The Royal Star of the Lion', summary: 'A promise of success, help from people in high places, and protection — one of Cheiro\'s most fortunate compounds.' },
  24: { compound: 24, title: 'Gain Through Association', summary: 'Favor from superiors and harmonious partnerships bring material assistance your own effort alone would not.' },
  25: { compound: 25, title: 'Strength Through Experience', summary: 'Reward follows reflection — the lesson has to actually be learned before the gain arrives.' },
  26: { compound: 26, title: 'Caution in Partnership', summary: "A warning against leaning too heavily on others' advice, especially in shared financial decisions." },
  27: { compound: 27, title: 'Command', summary: 'Authority earned through inner discipline — effective as long as it doesn\'t tip into control for its own sake.' },
  28: { compound: 28, title: 'Contradiction', summary: 'Real natural gifts paired with a tendency to repeat past mistakes by trusting the wrong people again.' },
  29: { compound: 29, title: 'The Trial', summary: 'A number that tests discernment — emotional and relational deception is the specific risk to watch for.' },
  30: { compound: 30, title: 'The Contemplative', summary: 'Thoughtful and philosophical, with real success available once actually focused on a goal.' },
  31: { compound: 31, title: 'The Self-Reliant', summary: 'Achievement through your own resources — solitary, steady, and effective.' },
  32: { compound: 32, title: 'The Gifted Leader', summary: 'Natural talent that can bring real influence — the responsibility is using it with integrity, not just skill.' },
  33: { compound: 33, title: 'The Heavy Mantle', summary: 'Significant influence paired with significant responsibility — grounding matters more here than ambition.' },
  34: { compound: 34, title: 'Reversal', summary: 'Echoes 16 — sudden change in fortune when earlier warning signs go ignored.' },
  35: { compound: 35, title: 'Steady Judgement', summary: 'Calm, experience-based decision-making that produces reliable, if unspectacular, gains.' },
  36: { compound: 36, title: 'Harmony', summary: 'Love and cooperation combine well here — favorable for creative and relational partnerships.' },
  37: { compound: 37, title: 'The Union', summary: 'A genuinely favorable compound for partnership, in love or in business, built on real cooperation.' },
  38: { compound: 38, title: 'Double Caution', summary: "Repeats 29's warning about deception — trust needs to be earned twice as carefully here." },
  39: { compound: 39, title: 'The Inner Circle', summary: 'Strength drawn from family and close bonds — support close to home is what carries you through.' },
  40: { compound: 40, title: 'Unseen Obstacle', summary: 'Good intentions aren\'t protection from complacency — stay alert even when things look settled.' },
  41: { compound: 41, title: 'Deliberate Creation', summary: 'Leadership energy, but slower and more considered than the raw ambition of a 1.' },
  42: { compound: 42, title: 'Learning Through Others', summary: 'Similar to 24, but the gain here comes specifically through mentorship and guidance, not just favor.' },
  43: { compound: 43, title: 'Humility Before Overreach', summary: 'Another echo of 16/34 — a nudge to stay grounded before ambition outruns preparation.' },
  44: { compound: 44, title: 'Material Mastery', summary: 'Practical, disciplined command of material affairs — steady rather than dramatic.' },
  45: { compound: 45, title: 'Versatility', summary: 'Adaptability and clear communication open doors that rigidity would keep shut.' },
  46: { compound: 46, title: 'Balanced Partnership', summary: 'Domestic and cooperative harmony — favorable for ventures built with, not against, others.' },
  47: { compound: 47, title: 'Earned Recognition', summary: 'Careful, honest, analytical work gets seen and rewarded — no shortcuts needed.' },
  48: { compound: 48, title: 'Sound Planning', summary: 'Organization and good judgement translate directly into material reward.' },
  49: { compound: 49, title: 'Generosity Returned', summary: 'Service and goodwill toward others tend to come back around here.' },
  50: { compound: 50, title: 'The Reckoning', summary: 'Outcomes here closely mirror past effort and character, for better or worse — a mirror, not a verdict.' },
  51: { compound: 51, title: 'Earned Command', summary: 'Leadership that has to be demonstrated, not just claimed — capability speaks louder than ambition.' },
  52: { compound: 52, title: 'Completion', summary: 'The final compound — closing one chapter with a clear conscience before the next one starts.' },
}

export function meaningForCompound(compound: number): CompoundNumberMeaning | null {
  return CHALDEAN_COMPOUND_MEANINGS[compound] ?? null
}

function chaldeanCompoundTotal(fullName: string): number {
  const letters = fullName.toUpperCase().replace(/[^A-Z]/g, '')
  let total = 0
  for (const letter of letters) {
    total += CHALDEAN_LETTER_VALUES[letter] ?? 0
  }
  return total
}

function sumDownTo52(n: number): number {
  let value = n
  while (value > 52) {
    value = String(value)
      .split('')
      .reduce((sum, d) => sum + Number(d), 0)
  }
  return value
}

export interface ChaldeanExpression {
  compound: number
  root: NumberResult
}

export function chaldeanCompoundExpressionNumber(fullName: string): ChaldeanExpression {
  const compound = sumDownTo52(chaldeanCompoundTotal(fullName))
  const rootValue = reduceToSingleDigitOrMaster(compound)
  return {
    compound,
    root: { value: rootValue, isMaster: isMasterNumber(rootValue), system: 'chaldean' },
  }
}
