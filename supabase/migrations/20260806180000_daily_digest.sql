-- Daily email digest: pg_cron + pg_net to trigger a scheduled send, and the
-- per-profile opt-in/unsubscribe-token columns the send-daily-digest and
-- unsubscribe-digest edge functions read/write via the service-role client.
-- The actual cron.schedule(...) call (which needs the CRON_SECRET value) is
-- run separately via the CLI, not committed here — same "never commit a
-- secret" rule as .env, just applied to a migration file instead.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

alter table public.profiles
  add column daily_digest_opt_in boolean not null default true,
  add column unsubscribe_token uuid not null default gen_random_uuid();

create unique index profiles_unsubscribe_token_idx on public.profiles (unsubscribe_token);
