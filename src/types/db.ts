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

export interface MedicalReadingRow {
  id: string
  user_id: string
  birth_profile_id: string
  indications: unknown
  body: string
  disclaimer: string
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
