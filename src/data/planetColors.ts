// Classical Navagraha colour correspondences — the standard, widely-published association between
// each graha and a colour, used across Vedic astrology reference sources (and the basis for the
// traditional practice of wearing a planet's colour on its weekday). Fixed reference data, never
// generated, same principle as grahaMantras.ts: the app narrates around a traditional fact, it does
// not invent the fact.
//
// `hex` is a representative swatch chosen to read legibly against Astra's dark and light palettes —
// it is an illustration of the traditional colour, not a claim that a specific hex value is itself
// canonical. `name` is what the user actually reads; the swatch is secondary.
//
// Deliberately NOT included: any "colour to avoid" mapping. There is no classical basis clean enough
// to justify telling someone a colour is bad for them, so that is left unbuilt rather than invented.

import type { PlanetId } from '@/astro-engine/types'

export interface PlanetColor {
  name: string
  hex: string
}

export const PLANET_COLORS: Record<PlanetId, PlanetColor> = {
  Sun: { name: 'Deep orange', hex: '#e0763f' },
  Moon: { name: 'Soft white', hex: '#e8e4da' },
  Mars: { name: 'Red', hex: '#c23b3b' },
  Mercury: { name: 'Green', hex: '#4a9b6e' },
  Jupiter: { name: 'Yellow', hex: '#d9a441' },
  Venus: { name: 'Pale pink', hex: '#e8c9d8' },
  Saturn: { name: 'Deep blue', hex: '#3b4a6b' },
  Rahu: { name: 'Smoky grey', hex: '#6b6b73' },
  Ketu: { name: 'Muted brown', hex: '#7a6a5a' },
}
