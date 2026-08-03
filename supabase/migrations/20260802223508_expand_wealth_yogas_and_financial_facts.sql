-- Deepen Financial Astrology: expand Dhana Yoga to the classical 2nd/5th/9th/11th lord set, add
-- Kubera/Chandra-Mangal/Gajakesari yoga definitions, and add a house_strength column for the
-- 2nd/5th/9th/10th/11th house facts the financial-reading function now computes.

update public.ref_yoga_definitions
set description = 'Any two of the 2nd (wealth), 5th (speculation), 9th (fortune), or 11th (gains) lords occupy each other''s sign or share a sign — a classical wealth-accumulation combination.'
where key = 'dhana_yoga';

insert into public.ref_yoga_definitions (key, name, category, description) values
  ('kubera_yoga', 'Kubera Yoga', 'wealth', 'One commonly-cited formulation (classical sources give several distinct versions): the 11th lord (gains) is in its own sign or exalted, and placed in a kendra (1/4/7/10) or trikona (1/5/9) from the ascendant.'),
  ('chandra_mangal_yoga', 'Chandra-Mangal Yoga', 'wealth', 'Moon and Mars conjunct in the same sign — a classical combination associated with resourcefulness and wealth through initiative.'),
  ('gajakesari_yoga', 'Gajakesari Yoga', 'wealth', 'Jupiter in a kendra (1st, 4th, 7th, or 10th house) counted from the Moon''s own sign — a well-established classical yoga for fortune and reputation.');

alter table public.financial_readings add column house_strength jsonb not null default '[]'::jsonb;
alter table public.financial_readings add column current_period_outlook jsonb not null default '{}'::jsonb;
