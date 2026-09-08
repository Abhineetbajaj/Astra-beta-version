// Hand-written row types for the tables the frontend queries directly (read paths mostly —
// writes to generated-content/billing tables happen through edge functions). Not a full
// generated schema; once linked to a real Supabase project, prefer
// `supabase gen types typescript --linked` and reconcile with this file.

export interface ProfileRow {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  is_premium: boolean
  daily_digest_opt_in: boolean
  unsubscribe_token: string
  created_at: string
}

export interface BirthProfileRow {
  id: string
  user_id: string
  relation: 'self' | 'other'
  name: string
  date_of_birth: string
  time_of_birth: string | null
  time_known: boolean
  place_name: string
  lat: number
  lon: number
  utc_offset_minutes: number
  created_at: string
}

export interface CompanyProfileRow {
  id: string
  user_id: string
  company_name: string
  incorporation_date: string
  incorporation_time: string | null
  time_known: boolean
  place_name: string
  lat: number
  lon: number
  utc_offset_minutes: number
  created_at: string
}

export interface SubscriptionRow {
  id: string
  user_id: string
  plan: 'free' | 'premium'
  status: 'active' | 'past_due' | 'cancelled'
  razorpay_subscription_id: string | null
  current_period_end: string | null
}

export interface NatalChartRow {
  id: string
  birth_profile_id: string | null
  company_profile_id: string | null
  ayanamsa_deg: number
  ascendant_rashi_index: number | null
  ascendant_degree: number | null
  houses_reliable: boolean
  computation_basis: string
  computed_at: string
}

export interface ChartPlacementRow {
  id: string
  natal_chart_id: string
  planet: string
  sign_index: number
  degree_in_sign: number
  nakshatra_index: number
  nakshatra_pada: number
  house_index: number | null
  retrograde: boolean
  dignity: 'exalted' | 'debilitated' | 'own' | 'neutral'
}

export interface DashaPeriodRow {
  id: string
  natal_chart_id: string
  parent_id: string | null
  level: 'maha' | 'antar'
  lord: string
  start_date: string
  end_date: string
}

export interface DailyReadingRow {
  id: string
  user_id: string
  birth_profile_id: string
  reading_date: string
  facts_used: unknown
  body: string
  focus_card: string
  love_card: string
  career_card: string
  watch_card: string
  created_at: string
}

export interface WeeklyReportRow {
  id: string
  user_id: string
  birth_profile_id: string
  week_start: string
  body: string
  highlights: string[]
  watch_outs: string[]
  created_at: string
}

export interface CompatibilityReportRow {
  id: string
  user_id: string
  profile_a_id: string
  profile_b_id: string
  guna_breakdown: { bhakoot: { points: number; max: number }; gana: { points: number; max: number }; nadi: { points: number; max: number } }
  guna_total: number
  guna_max: number
  prose: string
  created_at: string
}

export interface ChatMessageRow {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface FinancialReadingRow {
  id: string
  user_id: string
  birth_profile_id: string | null
  company_profile_id: string | null
  kind: 'personal' | 'company'
  wealth_yogas: { key: string; name: string; category: string; notes: string | null }[]
  house_strength: { house: number; lord: string; lordDignity: string; lordHouse: number | null; occupants: string[] }[]
  favorable_periods: { lord: string; startDate: string; endDate: string; classification: string }[]
  current_period_outlook: {
    mahadashaLord: string
    mahadashaClassification: string
    antardashaLord: string | null
    antardashaClassification: string | null
  }
  body: string
  disclaimer: string
  created_at: string
}

/** The structured facts `medical-reading` computes and stores alongside its AI-narrated `body` —
    written by supabase/functions/medical-reading/index.ts (see `indications` there for the exact
    shape). Previously typed `unknown` and never read back; Step 10 of the Wellness redesign starts
    surfacing these as real, already-computed scannable signals instead of only prose. Kept loose
    (`string` for planet/dignity names rather than importing astro-engine's PlanetId/Dignity unions)
    because this is JSONB round-tripped through Postgres — the real union types don't survive that
    trip, so treat every field as needing a runtime check before use, same discipline as the rest of
    this codebase applies to any DB-sourced value. `ascendantLordVitality`/`houseLords`/
    `restProneperiods` are only populated when the natal ascendant is known — an unreliable birth
    time leaves them empty, not fabricated. */
export interface MedicalReadingIndications {
  houseOccupants: Record<string, string[]>
  houseLords: { house: number; lord: string; dignity: string; afflicted: boolean; mitigated: boolean }[]
  ascendantLordVitality: { lord: string; dignity: string; house: number | null; retrograde: boolean } | Record<string, never>
  restProneperiods: { lord: string; startDate: string; endDate: string; classification: 'rest-prone' | 'steady' }[]
  currentPeriodOutlook: { mahadashaLord: string; antardashaLord: string | null }
}

export interface MedicalReadingRow {
  id: string
  user_id: string
  birth_profile_id: string
  indications: MedicalReadingIndications
  body: string
  disclaimer: string
  created_at: string
}

export interface NumerologyReadingRow {
  id: string
  user_id: string
  birth_profile_id: string
  system: 'pythagorean' | 'chaldean' | 'vedic'
  core_numbers: unknown
  body: string
  created_at: string
}

export interface NumerologyDailyReadingRow {
  id: string
  user_id: string
  birth_profile_id: string
  reading_date: string
  personal_year: number
  personal_month: number
  personal_day: number
  facts_used: unknown
  body: string
  created_at: string
}

export interface NumerologyCompatibilityReadingRow {
  id: string
  user_id: string
  birth_profile_id: string
  partner_name: string
  partner_date_of_birth: string
  compatibility: unknown
  body: string
  created_at: string
}

export interface RashiHoroscopeRow {
  id: string
  rashi_index: number
  horoscope_date: string
  body: string
  mood: string
  lucky_number: number
  lucky_color: string
  created_at: string
}

export interface PushSubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export interface AstrologerRow {
  id: string
  name: string
  bio: string
  specialties: string[]
  years_experience: number
  rate_per_minute: number
  avatar_url: string | null
  is_active: boolean
}

export interface WalletTransactionRow {
  id: string
  user_id: string
  type: 'topup' | 'debit'
  amount: number
  label: string
  created_at: string
}

export interface MeditationTrackRow {
  id: string
  category: 'today' | 'weekly' | 'panchang' | 'need' | 'mantra'
  title: string
  script_text: string
  audio_url: string | null
  planet_context: string | null
  need_tag: string | null
  panchang_event: string | null
  valid_date: string | null
  is_premium: boolean
  dedupe_key: string
  created_at: string
}

export interface UserMeditationHistoryRow {
  id: string
  user_id: string
  track_id: string
  played_at: string
  completed: boolean
  favorited: boolean
}
