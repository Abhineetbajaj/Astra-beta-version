-- Astra initial schema.
-- See CLAUDE.md (architecture rules) and USERSTORE.md (what each table holds, why, and who
-- reads/writes it) for the narrative version of this. Keep both updated alongside schema changes.

create extension if not exists "pgcrypto";

-- ============================================================================
-- Reference data (seeded in the next migration). Static, code-managed, public
-- read-only — these mirror src/data/*.ts and src/astro-engine/guna.ts exactly
-- so the DB and the (still-used-for-client-preview) TS engine never disagree.
-- ============================================================================

create table public.ref_rashis (
  index smallint primary key,
  name text not null,
  sanskrit text not null,
  element text not null,
  lord text not null
);

create table public.ref_nakshatras (
  index smallint primary key,
  name text not null,
  lord text not null,
  start_degree double precision not null
);

create table public.ref_grahas (
  key text primary key,
  name text not null,
  significations text not null
);

create table public.ref_bhavas (
  house smallint primary key,
  name text not null,
  significations text not null
);

create table public.ref_vimshottari_sequence (
  position smallint primary key,
  lord text not null,
  years numeric not null
);

create table public.ref_kuta_rules (
  kuta text primary key,
  max_points smallint not null,
  description text not null
);

create table public.ref_yoga_definitions (
  key text primary key,
  name text not null,
  category text not null check (category in ('wealth', 'health', 'general')),
  description text not null
);

-- ============================================================================
-- profiles — one row per authenticated user (email or Google OAuth)
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_url text,
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth.users row appears, whether from
-- email/password sign-up or Google OAuth (which populates raw_user_meta_data
-- .name / .picture automatically). First-time Google login lands here exactly
-- like email sign-up, so onboarding (birth profile creation) runs the same way.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  insert into public.subscriptions (user_id, plan, status) values (new.id, 'free', 'active');
  return new;
end;
$$;

-- ============================================================================
-- birth_profiles — the user's own birth details, plus any "other person"
-- profiles saved for compatibility checks.
-- ============================================================================

create table public.birth_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  relation text not null default 'self' check (relation in ('self', 'other')),
  name text not null,
  date_of_birth date not null,
  time_of_birth time,
  time_known boolean not null default true,
  place_name text not null,
  lat double precision not null,
  lon double precision not null,
  utc_offset_minutes integer not null,
  created_at timestamptz not null default now()
);

create index birth_profiles_user_id_idx on public.birth_profiles (user_id);
-- At most one "self" birth profile per user (any number of saved "other" profiles).
create unique index one_self_profile_per_user on public.birth_profiles (user_id) where relation = 'self';

-- ============================================================================
-- company_profiles — incorporation date treated like a birth chart (Section 6,
-- Financial Astrology business-chart feature). Same computation pipeline,
-- different subject.
-- ============================================================================

create table public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_name text not null,
  incorporation_date date not null,
  incorporation_time time,
  time_known boolean not null default true,
  place_name text not null,
  lat double precision not null,
  lon double precision not null,
  utc_offset_minutes integer not null,
  created_at timestamptz not null default now()
);

create index company_profiles_user_id_idx on public.company_profiles (user_id);

-- ============================================================================
-- natal_charts / chart_placements / dasha_periods / chart_yogas
-- Precomputed chart facts. Always written by the compute-chart edge function
-- (astro-engine), never by an LLM. Exactly one of birth_profile_id /
-- company_profile_id is set.
-- ============================================================================

create table public.natal_charts (
  id uuid primary key default gen_random_uuid(),
  birth_profile_id uuid references public.birth_profiles (id) on delete cascade,
  company_profile_id uuid references public.company_profiles (id) on delete cascade,
  ayanamsa_deg double precision not null,
  ascendant_rashi_index integer,
  ascendant_degree double precision,
  houses_reliable boolean not null,
  computation_basis text not null,
  computed_at timestamptz not null default now(),
  constraint exactly_one_subject check (
    (birth_profile_id is not null and company_profile_id is null)
    or (birth_profile_id is null and company_profile_id is not null)
  ),
  constraint one_chart_per_birth_profile unique (birth_profile_id),
  constraint one_chart_per_company_profile unique (company_profile_id)
);

create table public.chart_placements (
  id uuid primary key default gen_random_uuid(),
  natal_chart_id uuid not null references public.natal_charts (id) on delete cascade,
  planet text not null,
  sign_index smallint not null,
  degree_in_sign double precision not null,
  nakshatra_index smallint not null,
  nakshatra_pada smallint not null,
  house_index smallint,
  retrograde boolean not null default false,
  dignity text not null default 'neutral'
);

create index chart_placements_chart_id_idx on public.chart_placements (natal_chart_id);

create table public.dasha_periods (
  id uuid primary key default gen_random_uuid(),
  natal_chart_id uuid not null references public.natal_charts (id) on delete cascade,
  parent_id uuid references public.dasha_periods (id) on delete cascade,
  level text not null check (level in ('maha', 'antar')),
  lord text not null,
  start_date timestamptz not null,
  end_date timestamptz not null
);

create index dasha_periods_chart_id_idx on public.dasha_periods (natal_chart_id);
create index dasha_periods_parent_id_idx on public.dasha_periods (parent_id);
create index dasha_periods_active_idx on public.dasha_periods (natal_chart_id, start_date, end_date);

create table public.chart_yogas (
  id uuid primary key default gen_random_uuid(),
  natal_chart_id uuid not null references public.natal_charts (id) on delete cascade,
  yoga_key text not null references public.ref_yoga_definitions (key),
  notes text,
  detected_at timestamptz not null default now()
);

create index chart_yogas_chart_id_idx on public.chart_yogas (natal_chart_id);

-- ============================================================================
-- Generated content — daily readings, weekly reports, compatibility, chat,
-- financial/medical readings. Facts always come from the tables above; the
-- LLM (Gemini) only turns those facts into prose. `facts_used` on each row
-- records exactly which facts grounded the generation, for auditability.
-- ============================================================================

create table public.daily_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  birth_profile_id uuid not null references public.birth_profiles (id) on delete cascade,
  reading_date date not null,
  facts_used jsonb not null,
  body text not null,
  focus_card text not null,
  love_card text not null,
  career_card text not null,
  watch_card text not null,
  model text not null default 'gemini-2.5-flash',
  created_at timestamptz not null default now(),
  unique (birth_profile_id, reading_date)
);

create index daily_readings_user_id_idx on public.daily_readings (user_id);

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  birth_profile_id uuid not null references public.birth_profiles (id) on delete cascade,
  week_start date not null,
  facts_used jsonb not null,
  body text not null,
  model text not null default 'gemini-2.5-flash',
  created_at timestamptz not null default now(),
  unique (birth_profile_id, week_start)
);

create index weekly_reports_user_id_idx on public.weekly_reports (user_id);

create table public.compatibility_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  profile_a_id uuid not null references public.birth_profiles (id) on delete cascade,
  profile_b_id uuid not null references public.birth_profiles (id) on delete cascade,
  guna_breakdown jsonb not null,
  guna_total smallint not null,
  guna_max smallint not null default 21,
  prose text not null,
  model text not null default 'gemini-2.5-flash',
  created_at timestamptz not null default now()
);

create index compatibility_reports_user_id_idx on public.compatibility_reports (user_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  facts_used jsonb,
  model text default 'gemini-2.5-flash',
  created_at timestamptz not null default now()
);

create index chat_messages_user_id_idx on public.chat_messages (user_id, created_at);

create table public.financial_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  birth_profile_id uuid references public.birth_profiles (id) on delete cascade,
  company_profile_id uuid references public.company_profiles (id) on delete cascade,
  kind text not null check (kind in ('personal', 'company')),
  wealth_yogas jsonb not null,
  favorable_periods jsonb not null,
  body text not null,
  disclaimer text not null default 'Not financial or investment advice — a traditional astrological perspective for reflection only.',
  model text not null default 'gemini-2.5-flash',
  created_at timestamptz not null default now(),
  constraint financial_reading_one_subject check (
    (kind = 'personal' and birth_profile_id is not null and company_profile_id is null)
    or (kind = 'company' and company_profile_id is not null and birth_profile_id is null)
  )
);

create index financial_readings_user_id_idx on public.financial_readings (user_id);

create table public.medical_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  birth_profile_id uuid not null references public.birth_profiles (id) on delete cascade,
  indications jsonb not null,
  body text not null,
  disclaimer text not null default 'Not medical advice or diagnosis — a traditional astrological perspective only. Consult a healthcare professional for real health concerns.',
  model text not null default 'gemini-2.5-flash',
  created_at timestamptz not null default now()
);

create index medical_readings_user_id_idx on public.medical_readings (user_id);

-- ============================================================================
-- Astrologer marketplace + live consultations, backed by the wallet.
-- ============================================================================

create table public.astrologers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text not null,
  specialties text[] not null default '{}',
  years_experience smallint not null default 0,
  rate_per_minute integer not null,
  avatar_url text,
  is_active boolean not null default true
);

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  astrologer_id uuid not null references public.astrologers (id),
  status text not null default 'requested' check (status in ('requested', 'active', 'completed', 'cancelled')),
  started_at timestamptz,
  ended_at timestamptz,
  total_minutes numeric,
  total_credits_charged integer,
  created_at timestamptz not null default now()
);

create index consultations_user_id_idx on public.consultations (user_id);

create table public.consultation_messages (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations (id) on delete cascade,
  sender text not null check (sender in ('user', 'astrologer')),
  content text not null,
  created_at timestamptz not null default now()
);

create index consultation_messages_consultation_id_idx on public.consultation_messages (consultation_id, created_at);

-- ============================================================================
-- Billing: subscriptions (Premium), wallet (consultation credits), Razorpay
-- linkage. Real money flows are edge-function-only (service role); the client
-- only ever reads its own rows.
-- ============================================================================

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  status text not null default 'active' check (status in ('active', 'past_due', 'cancelled')),
  razorpay_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('topup', 'debit')),
  amount integer not null check (amount > 0),
  label text not null,
  razorpay_payment_id text,
  created_at timestamptz not null default now()
);

create index wallet_transactions_user_id_idx on public.wallet_transactions (user_id, created_at);

create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  razorpay_order_id text not null unique,
  amount integer not null,
  currency text not null default 'INR',
  purpose text not null check (purpose in ('wallet_topup', 'premium_subscription')),
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  created_at timestamptz not null default now()
);

create index payment_orders_user_id_idx on public.payment_orders (user_id);

-- Now that subscriptions exists, attach the auth.users trigger.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- Row Level Security. Reference and marketplace tables are public-read.
-- Everything else: owner-only via auth.uid(); writes to generated-content and
-- billing tables happen through edge functions using the service role, which
-- bypasses RLS by design (users never write facts/prose/money rows directly).
-- ============================================================================

alter table public.ref_rashis enable row level security;
alter table public.ref_nakshatras enable row level security;
alter table public.ref_grahas enable row level security;
alter table public.ref_bhavas enable row level security;
alter table public.ref_vimshottari_sequence enable row level security;
alter table public.ref_kuta_rules enable row level security;
alter table public.ref_yoga_definitions enable row level security;
alter table public.astrologers enable row level security;

create policy "public read" on public.ref_rashis for select using (true);
create policy "public read" on public.ref_nakshatras for select using (true);
create policy "public read" on public.ref_grahas for select using (true);
create policy "public read" on public.ref_bhavas for select using (true);
create policy "public read" on public.ref_vimshottari_sequence for select using (true);
create policy "public read" on public.ref_kuta_rules for select using (true);
create policy "public read" on public.ref_yoga_definitions for select using (true);
create policy "public read active astrologers" on public.astrologers for select using (is_active = true);

alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);

alter table public.birth_profiles enable row level security;
create policy "manage own birth profiles" on public.birth_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.company_profiles enable row level security;
create policy "manage own company profiles" on public.company_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.natal_charts enable row level security;
create policy "read own natal charts" on public.natal_charts for select using (
  exists (select 1 from public.birth_profiles bp where bp.id = birth_profile_id and bp.user_id = auth.uid())
  or exists (select 1 from public.company_profiles cp where cp.id = company_profile_id and cp.user_id = auth.uid())
);

alter table public.chart_placements enable row level security;
create policy "read own chart placements" on public.chart_placements for select using (
  exists (
    select 1 from public.natal_charts nc
    left join public.birth_profiles bp on bp.id = nc.birth_profile_id
    left join public.company_profiles cp on cp.id = nc.company_profile_id
    where nc.id = natal_chart_id and (bp.user_id = auth.uid() or cp.user_id = auth.uid())
  )
);

alter table public.dasha_periods enable row level security;
create policy "read own dasha periods" on public.dasha_periods for select using (
  exists (
    select 1 from public.natal_charts nc
    left join public.birth_profiles bp on bp.id = nc.birth_profile_id
    left join public.company_profiles cp on cp.id = nc.company_profile_id
    where nc.id = natal_chart_id and (bp.user_id = auth.uid() or cp.user_id = auth.uid())
  )
);

alter table public.chart_yogas enable row level security;
create policy "read own chart yogas" on public.chart_yogas for select using (
  exists (
    select 1 from public.natal_charts nc
    left join public.birth_profiles bp on bp.id = nc.birth_profile_id
    left join public.company_profiles cp on cp.id = nc.company_profile_id
    where nc.id = natal_chart_id and (bp.user_id = auth.uid() or cp.user_id = auth.uid())
  )
);

alter table public.daily_readings enable row level security;
create policy "read own daily readings" on public.daily_readings for select using (auth.uid() = user_id);

alter table public.weekly_reports enable row level security;
create policy "read own weekly reports" on public.weekly_reports for select using (auth.uid() = user_id);

alter table public.compatibility_reports enable row level security;
create policy "read own compatibility reports" on public.compatibility_reports for select using (auth.uid() = user_id);

alter table public.chat_messages enable row level security;
create policy "read own chat messages" on public.chat_messages for select using (auth.uid() = user_id);

alter table public.financial_readings enable row level security;
create policy "read own financial readings" on public.financial_readings for select using (auth.uid() = user_id);

alter table public.medical_readings enable row level security;
create policy "read own medical readings" on public.medical_readings for select using (auth.uid() = user_id);

alter table public.consultations enable row level security;
create policy "manage own consultations" on public.consultations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.consultation_messages enable row level security;
create policy "read own consultation messages" on public.consultation_messages for select using (
  exists (select 1 from public.consultations c where c.id = consultation_id and c.user_id = auth.uid())
);

alter table public.subscriptions enable row level security;
create policy "read own subscription" on public.subscriptions for select using (auth.uid() = user_id);

alter table public.wallet_transactions enable row level security;
create policy "read own wallet transactions" on public.wallet_transactions for select using (auth.uid() = user_id);

alter table public.payment_orders enable row level security;
create policy "read own payment orders" on public.payment_orders for select using (auth.uid() = user_id);
