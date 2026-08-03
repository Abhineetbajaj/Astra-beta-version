import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SignNamingStyle = 'western' | 'vedic'

interface ChartDisplayState {
  namingStyle: SignNamingStyle
  setNamingStyle: (style: SignNamingStyle) => void
}

/** Persisted UI preference: display sign names as Western (Sagittarius) or Sanskrit/Vedic (Dhanu). Purely cosmetic — never affects computed chart facts. */
export const useChartDisplayStore = create<ChartDisplayState>()(
  persist(
    (set) => ({
      namingStyle: 'western',
      setNamingStyle: (namingStyle) => set({ namingStyle }),
    }),
    { name: 'astra-chart-display' },
  ),
)
