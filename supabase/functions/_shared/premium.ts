import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/** Financial/medical astrology, compatibility, and weekly reports are Premium-gated. */
export async function requirePremium(admin: SupabaseClient, userId: string): Promise<void> {
  const { data } = await admin.from('subscriptions').select('plan, status').eq('user_id', userId).maybeSingle()
  const isPremium = data?.plan === 'premium' && data?.status === 'active'
  if (!isPremium) {
    throw new PremiumRequiredError()
  }
}

export class PremiumRequiredError extends Error {
  constructor() {
    super('This feature requires Premium.')
    this.name = 'PremiumRequiredError'
  }
}
