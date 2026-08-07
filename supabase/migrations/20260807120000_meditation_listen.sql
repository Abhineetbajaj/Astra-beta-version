-- Astra "Listen" — meditation/reflection section. v1 is text-only (no TTS yet, see CLAUDE.md's
-- Known gaps); audio_url stays nullable so real narration can be added later without a schema
-- change. See supabase/functions/generate-meditation-tracks and generate-meditation-library.

create table public.meditation_tracks (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('today', 'weekly', 'panchang', 'need', 'mantra')),
  title text not null,
  script_text text not null,
  audio_url text,
  planet_context text,
  need_tag text check (
    need_tag is null or need_tag in (
      'stress-anxiety', 'career-doubt', 'financial-blocks', 'relationship-healing',
      'grief-loss', 'confidence', 'sleep'
    )
  ),
  panchang_event text,
  valid_date date,
  is_premium boolean not null default true,
  -- One dedupe key instead of five different partial-unique rules per category — each generator
  -- computes its own deterministic key, e.g. "today:Saturn:Rahu:3:2026-08-09",
  -- "panchang:Ekadashi:2026-08-11", "need:financial-blocks", "mantra:Saturn".
  dedupe_key text not null unique,
  created_at timestamptz not null default now()
);

create index meditation_tracks_category_idx on public.meditation_tracks (category, valid_date);

create table public.user_meditation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.meditation_tracks (id) on delete cascade,
  played_at timestamptz not null default now(),
  completed boolean not null default false,
  favorited boolean not null default false,
  unique (user_id, track_id)
);

create index user_meditation_history_user_id_idx on public.user_meditation_history (user_id, played_at desc);

alter table public.meditation_tracks enable row level security;

-- Public-read table (like ref_* / astrologers), but is_premium=true rows must not leak script_text
-- to non-premium users via a direct client query — gating enforced here, not just in the UI.
create policy "read accessible meditation tracks" on public.meditation_tracks for select
using (
  is_premium = false
  or exists (
    select 1 from public.subscriptions s
    where s.user_id = auth.uid() and s.plan = 'premium' and s.status = 'active'
  )
);

alter table public.user_meditation_history enable row level security;
create policy "manage own meditation history" on public.user_meditation_history for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);
