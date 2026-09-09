-- Per-user, per-reading-type, per-UTC-day cap on Rumik Silk TTS synthesis ("Listen to this
-- reading"). Stage 1 of the voice work stores NO audio anywhere — synthesized audio streams
-- straight back to the browser and lives only in that tab's memory — so this table exists purely
-- to bound trial spend. It holds counts and dates, never audio bytes and never reading text.
--
-- Why a cap at all: both narrated readings (daily_readings, numerology_daily_readings) are free to
-- every signed-in user and nothing is cached, so without this a single user could trigger unlimited
-- paid synthesis by reloading and replaying.

create table public.tts_usage_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_table text not null check (source_table in ('daily_readings', 'numerology_daily_readings')),
  usage_date date not null,
  generation_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_table, usage_date)
);

create index tts_usage_daily_user_id_idx on public.tts_usage_daily (user_id, usage_date desc);

alter table public.tts_usage_daily enable row level security;

-- Deliberately NO policies. RLS enabled with zero policies denies anon/authenticated entirely,
-- while the service role bypasses RLS — so only the `get-reading-audio` edge function can touch
-- this table. The browser never queries it; the cap is communicated through that function's 429
-- response instead. Same "generated/service-written data is never client-writable" posture the rest
-- of the schema already takes.

-- Check-and-increment in ONE statement. The conditional DO UPDATE closes the read-then-write race:
-- two concurrent requests cannot both pass at the limit boundary, because the second one's update
-- is filtered out and returns no row. Returns the new count on success, or no row at all (NULL to
-- the caller) when the cap is already reached.
create function public.claim_tts_generation(
  p_user_id uuid,
  p_source_table text,
  p_daily_limit integer
) returns integer
language sql
set search_path = public
as $$
  insert into public.tts_usage_daily (user_id, source_table, usage_date, generation_count)
  values (p_user_id, p_source_table, current_date, 1)
  on conflict (user_id, source_table, usage_date) do update
    set generation_count = tts_usage_daily.generation_count + 1,
        updated_at = now()
    where tts_usage_daily.generation_count < p_daily_limit
  returning generation_count;
$$;

-- Hands a claimed slot back when synthesis fails. At a daily limit of 1, without this one transient
-- upstream failure would silently cost the user their entire day's listen.
create function public.release_tts_generation(
  p_user_id uuid,
  p_source_table text
) returns void
language sql
set search_path = public
as $$
  update public.tts_usage_daily
     set generation_count = greatest(generation_count - 1, 0),
         updated_at = now()
   where user_id = p_user_id
     and source_table = p_source_table
     and usage_date = current_date;
$$;

-- Both functions are SECURITY INVOKER (the default) — a deliberate departure from
-- handle_new_user()'s `security definer`, which needs it only because it runs as a trigger on
-- auth.users. Here, definer would be a real hole: Postgres grants EXECUTE to PUBLIC by default, so
-- a definer function taking p_user_id as a parameter would let any authenticated user inflate (or
-- release) ANY other user's counter while bypassing RLS. Invoker + the revokes below close that off
-- twice over.
revoke execute on function public.claim_tts_generation(uuid, text, integer) from public;
revoke execute on function public.release_tts_generation(uuid, text) from public;
grant execute on function public.claim_tts_generation(uuid, text, integer) to service_role;
grant execute on function public.release_tts_generation(uuid, text) to service_role;
