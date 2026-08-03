-- gemini-2.5-flash is no longer available to newer API keys (confirmed via direct API testing).
-- Switch the default to the current stable flash-tier model so the `model` column accurately
-- records what was actually used, without requiring every edge function insert to set it explicitly.

alter table public.daily_readings alter column model set default 'gemini-3.5-flash';
alter table public.weekly_reports alter column model set default 'gemini-3.5-flash';
alter table public.compatibility_reports alter column model set default 'gemini-3.5-flash';
alter table public.chat_messages alter column model set default 'gemini-3.5-flash';
alter table public.financial_readings alter column model set default 'gemini-3.5-flash';
alter table public.medical_readings alter column model set default 'gemini-3.5-flash';
