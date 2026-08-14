-- Numerology: core-number AI synthesis (regenerate-on-demand) + the daily Personal Day reading
-- (idempotent per birth_profile/date, same shape as daily_readings). Free for everyone in MVP —
-- see CLAUDE.md. `system` is carried on numerology_readings from day one so Chaldean/Vedic can
-- ship later without a schema break; the daily table stays Pythagorean-only by design.

create table public.numerology_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  birth_profile_id uuid not null references public.birth_profiles (id) on delete cascade,
  system text not null default 'pythagorean' check (system in ('pythagorean', 'chaldean', 'vedic')),
  core_numbers jsonb not null,
  body text not null,
  model text not null default 'gemini-3.5-flash',
  created_at timestamptz not null default now()
);

create index numerology_readings_user_id_idx on public.numerology_readings (user_id);

create table public.numerology_daily_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  birth_profile_id uuid not null references public.birth_profiles (id) on delete cascade,
  reading_date date not null,
  personal_year smallint not null,
  personal_month smallint not null,
  personal_day smallint not null,
  facts_used jsonb not null,
  body text not null,
  model text not null default 'gemini-3.5-flash',
  created_at timestamptz not null default now(),
  unique (birth_profile_id, reading_date)
);

create index numerology_daily_readings_user_id_idx on public.numerology_daily_readings (user_id);

alter table public.numerology_readings enable row level security;
create policy "read own numerology readings" on public.numerology_readings for select using (auth.uid() = user_id);

alter table public.numerology_daily_readings enable row level security;
create policy "read own numerology daily readings" on public.numerology_daily_readings for select using (auth.uid() = user_id);
