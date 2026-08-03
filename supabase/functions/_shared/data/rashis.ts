// Deno copy of src/data/rashis.ts — keep in sync; do not diverge silently.

export interface Rashi {
  index: number
  name: string
  sanskrit: string
  element: 'Fire' | 'Earth' | 'Air' | 'Water'
  symbol: string
}

export const RASHIS: Rashi[] = [
  { index: 0, name: 'Aries', sanskrit: 'Mesha', element: 'Fire', symbol: '♈' },
  { index: 1, name: 'Taurus', sanskrit: 'Vrishabha', element: 'Earth', symbol: '♉' },
  { index: 2, name: 'Gemini', sanskrit: 'Mithuna', element: 'Air', symbol: '♊' },
  { index: 3, name: 'Cancer', sanskrit: 'Karka', element: 'Water', symbol: '♋' },
  { index: 4, name: 'Leo', sanskrit: 'Simha', element: 'Fire', symbol: '♌' },
  { index: 5, name: 'Virgo', sanskrit: 'Kanya', element: 'Earth', symbol: '♍' },
  { index: 6, name: 'Libra', sanskrit: 'Tula', element: 'Air', symbol: '♎' },
  { index: 7, name: 'Scorpio', sanskrit: 'Vrishchika', element: 'Water', symbol: '♏' },
  { index: 8, name: 'Sagittarius', sanskrit: 'Dhanu', element: 'Fire', symbol: '♐' },
  { index: 9, name: 'Capricorn', sanskrit: 'Makara', element: 'Earth', symbol: '♑' },
  { index: 10, name: 'Aquarius', sanskrit: 'Kumbha', element: 'Air', symbol: '♒' },
  { index: 11, name: 'Pisces', sanskrit: 'Meena', element: 'Water', symbol: '♓' },
]

export function rashiForLongitude(siderealLongitude: number): Rashi {
  const normalized = ((siderealLongitude % 360) + 360) % 360
  const index = Math.floor(normalized / 30)
  return RASHIS[index]
}

export function degreeInRashi(siderealLongitude: number): number {
  const normalized = ((siderealLongitude % 360) + 360) % 360
  return normalized % 30
}

export const RASHI_LORD = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
] as const
