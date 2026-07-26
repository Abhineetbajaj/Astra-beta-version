import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from '@/types/domain'
import { persistProfileUpdate } from '@/services/authService'

interface AuthState {
  user: UserProfile | null
  signIn: (user: UserProfile) => void
  signOut: () => void
  updateProfile: (patch: Partial<UserProfile>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
      updateProfile: (patch) =>
        set((state) => {
          if (!state.user) return state
          const updated = { ...state.user, ...patch }
          persistProfileUpdate(updated)
          return { user: updated }
        }),
    }),
    { name: 'astra-auth' },
  ),
)
