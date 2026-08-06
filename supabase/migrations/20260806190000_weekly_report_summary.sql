-- Plain-English "what's good for you / what to avoid" summary lists below the weekly deep-dive's
-- 4 detailed paragraphs — a deliberate contrast: the paragraphs stay citation-dense, this summary
-- is the jargon-free takeaway. See supabase/functions/weekly-report/index.ts.

alter table public.weekly_reports
  add column highlights jsonb not null default '[]'::jsonb,
  add column watch_outs jsonb not null default '[]'::jsonb;
