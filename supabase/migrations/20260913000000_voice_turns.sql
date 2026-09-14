-- Server-authoritative metering for the voice AI Astrologer. One row per assistant answer that has
-- been spoken or is part of a voice turn, keyed by chat_message_id.
--
-- Two jobs:
--   1. Bound paid Rumik synthesis. get-voice-audio accepts only a messageId, so a user can already
--      only speak their OWN real answers — but nothing stopped them replaying the same answer
--      forever, each replay a paid call. The atomic claim below caps that per answer.
--   2. Record what each turn actually cost, server-side, from measured values rather than a client
--      timer. This is the foundation future pricing reads from; it deliberately encodes NO prices,
--      no credits, and no minute conversions.
--
-- Stores counts, durations and timings only — never audio, never transcripts, never answer text.
-- The answer itself already lives in chat_messages.content and is not duplicated here.

create table public.voice_turns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- One row per answer. This uniqueness is what makes the claim below atomic.
  chat_message_id uuid not null unique references public.chat_messages (id) on delete cascade,

  -- Speech-to-text leg. Null until voice-chat is wired to record it (a later phase) — a turn that
  -- began as typed chat and was merely spoken aloud legitimately has no STT leg at all.
  audio_duration_sec numeric,
  transcript_char_count integer,

  -- Reasoning leg.
  gemini_model text,

  -- Text-to-speech leg. answer_char_count is Rumik's billing unit.
  answer_char_count integer,
  synthesis_count integer not null default 0,

  stt_ms integer,
  llm_ms integer,
  tts_ms integer,
  total_ms integer,

  status text not null default 'pending'
    check (status in ('pending', 'success', 'stt_failed', 'llm_failed', 'tts_failed')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index voice_turns_user_id_idx on public.voice_turns (user_id, created_at desc);

alter table public.voice_turns enable row level security;

-- Deliberately NO policies, matching tts_usage_daily. RLS enabled with zero policies denies
-- anon/authenticated entirely while service_role bypasses RLS, so only edge functions touch this
-- table. Metering a user can edit is not metering.

-- Atomic check-and-increment, the same single-statement shape as claim_tts_generation. The
-- conditional DO UPDATE closes the read-then-write race: two concurrent replays cannot both pass at
-- the cap boundary, because the second one's update is filtered out and returns no row.
--
-- Returns the new synthesis_count on success, or no row (NULL to the caller) when the cap is
-- reached. p_user_id is re-checked in the WHERE as defence in depth — get-voice-audio has already
-- proven ownership via chat_messages before calling.
create function public.claim_voice_synthesis(
  p_user_id uuid,
  p_chat_message_id uuid,
  p_answer_char_count integer,
  p_max_syntheses integer
) returns integer
language sql
set search_path = public
as $$
  insert into public.voice_turns (user_id, chat_message_id, answer_char_count, synthesis_count)
  values (p_user_id, p_chat_message_id, p_answer_char_count, 1)
  on conflict (chat_message_id) do update
    set synthesis_count = voice_turns.synthesis_count + 1,
        answer_char_count = coalesce(voice_turns.answer_char_count, excluded.answer_char_count),
        updated_at = now()
    where voice_turns.user_id = p_user_id
      and voice_turns.synthesis_count < p_max_syntheses
  returning synthesis_count;
$$;

-- Hands a claimed synthesis back when Rumik fails, so an upstream outage does not silently burn a
-- user's allowance. Mirrors release_tts_generation.
create function public.release_voice_synthesis(
  p_user_id uuid,
  p_chat_message_id uuid
) returns void
language sql
set search_path = public
as $$
  update public.voice_turns
     set synthesis_count = greatest(synthesis_count - 1, 0),
         status = 'tts_failed',
         updated_at = now()
   where chat_message_id = p_chat_message_id
     and user_id = p_user_id;
$$;

-- Records the measured cost of a successful synthesis. Timings come from the server's own clock,
-- never from anything the client reports.
create function public.complete_voice_synthesis(
  p_user_id uuid,
  p_chat_message_id uuid,
  p_tts_ms integer
) returns void
language sql
set search_path = public
as $$
  update public.voice_turns
     set tts_ms = p_tts_ms,
         status = 'success',
         updated_at = now()
   where chat_message_id = p_chat_message_id
     and user_id = p_user_id;
$$;

-- SECURITY INVOKER (the default) rather than definer — the same reasoning as the tts_usage_daily
-- functions. These take p_user_id as a parameter, so a definer version plus Postgres's default
-- EXECUTE-to-PUBLIC grant would let any authenticated user inflate, release, or complete ANOTHER
-- user's metering while bypassing RLS. Invoker plus the revokes below closes that twice over.
--
-- Both revokes are required: `from public` removes the implicit grant, and `from anon,
-- authenticated` removes the explicit grants Supabase's project-level default privileges add (a
-- gap found the hard way during Phase A, see 20260910010000).
revoke execute on function public.claim_voice_synthesis(uuid, uuid, integer, integer) from public;
revoke execute on function public.release_voice_synthesis(uuid, uuid) from public;
revoke execute on function public.complete_voice_synthesis(uuid, uuid, integer) from public;

revoke execute on function public.claim_voice_synthesis(uuid, uuid, integer, integer) from anon, authenticated;
revoke execute on function public.release_voice_synthesis(uuid, uuid) from anon, authenticated;
revoke execute on function public.complete_voice_synthesis(uuid, uuid, integer) from anon, authenticated;

grant execute on function public.claim_voice_synthesis(uuid, uuid, integer, integer) to service_role;
grant execute on function public.release_voice_synthesis(uuid, uuid) to service_role;
grant execute on function public.complete_voice_synthesis(uuid, uuid, integer) to service_role;
