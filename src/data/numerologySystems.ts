import type { NumerologySystem } from '@/numerology-engine/types'

export interface NumerologySystemInfo {
  id: NumerologySystem
  label: string
  available: boolean
  blurb: string
}

/** Drives a future system-picker UI without a schema break — only Pythagorean is wired up today. */
export const NUMEROLOGY_SYSTEMS: NumerologySystemInfo[] = [
  {
    id: 'pythagorean',
    label: 'Pythagorean',
    available: true,
    blurb: 'The Western standard — Life Path, Expression, Soul Urge, Personality, and daily Personal Day/Month/Year.',
  },
  {
    id: 'chaldean',
    label: 'Chaldean',
    available: false,
    blurb: 'Coming soon — name-vibration numerology and compound numbers 10-52.',
  },
  {
    id: 'vedic',
    label: 'Vedic',
    available: false,
    blurb: 'Coming soon — Mulank, Bhagyank, and the Lo Shu grid, tied to the Navagraha.',
  },
]
