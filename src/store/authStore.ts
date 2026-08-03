import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { BirthProfileRow, ProfileRow } from '@/types/db'

interface AuthState {
  session: Session | null
  profile: ProfileRow | null
  selfBirthProfile: BirthProfileRow | null
  isPremium: boolean
  loading: boolean
  init: () => void
  refreshUserData: () => Promise<void>
  signOut: () => Promise<void>
}

let listenerAttached = false

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  selfBirthProfile: null,
  isPremium: false,
  loading: true,

  init: () => {
    if (listenerAttached) return
    listenerAttached = true

    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session })
      if (data.session) get().refreshUserData()
      else set({ loading: false })
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session })
      if (session) {
        get().refreshUserData()
      } else {
        set({ profile: null, selfBirthProfile: null, isPremium: false, loading: false })
      }
    })
  },

  refreshUserData: async () => {
    const session = get().session
    if (!session) return

    const [{ data: profile }, { data: birthProfile }, { data: subscription }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
      supabase.from('birth_profiles').select('*').eq('user_id', session.user.id).eq('relation', 'self').maybeSingle(),
      supabase.from('subscriptions').select('plan, status').eq('user_id', session.user.id).maybeSingle(),
    ])

    set({
      profile: (profile as ProfileRow) ?? null,
      selfBirthProfile: (birthProfile as BirthProfileRow) ?? null,
      isPremium: subscription?.plan === 'premium' && subscription?.status === 'active',
      loading: false,
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null, selfBirthProfile: null, isPremium: false })
  },
}))
