-- Numerology compatibility: Life Path/Expression/Soul Urge matching between the user and a named
-- partner. Deliberately does NOT create a birth_profiles row for the partner — that table's
-- place_name/lat/lon/utc_offset_minutes columns are NOT NULL (astrology needs them; numerology
-- doesn't), so partner name + date of birth are stored directly on the result row instead.

create table public.numerology_compatibility_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  birth_profile_id uuid not null references public.birth_profiles (id) on delete cascade,
  partner_name text not null,
  partner_date_of_birth date not null,
  compatibility jsonb not null,
  body text not null,
  model text not null default 'gemini-3.5-flash',
  created_at timestamptz not null default now()
);

create index numerology_compatibility_readings_user_id_idx on public.numerology_compatibility_readings (user_id);

alter table public.numerology_compatibility_readings enable row level security;
create policy "read own numerology compatibility readings" on public.numerology_compatibility_readings for select using (auth.uid() = user_id);
