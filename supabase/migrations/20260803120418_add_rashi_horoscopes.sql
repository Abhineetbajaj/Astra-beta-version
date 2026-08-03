-- Public "quick horoscope" feature: pick any of the 12 rashis, see a generic (not personal-chart)
-- reading for today. Deliberately separate from daily_readings — this is NOT computed from a real
-- birth chart, only from the sign's own classical facts (element, lord, today's weekday ruler).
-- Cached per (rashi, date) so every user picking the same sign on the same day sees the same
-- reading, same idempotency pattern as daily_readings.

create table public.rashi_horoscopes (
  id uuid primary key default gen_random_uuid(),
  rashi_index smallint not null references public.ref_rashis (index),
  horoscope_date date not null,
  body text not null,
  mood text not null,
  lucky_number smallint not null,
  lucky_color text not null,
  model text not null default 'gemini-3.5-flash',
  created_at timestamptz not null default now(),
  unique (rashi_index, horoscope_date)
);

alter table public.rashi_horoscopes enable row level security;
create policy "public read" on public.rashi_horoscopes for select using (true);
