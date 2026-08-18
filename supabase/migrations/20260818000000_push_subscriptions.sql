-- Web Push subscriptions — one row per device/browser a user has enabled notifications on. This
-- is user-device registration data, not generated content, so unlike every AI-generated-content
-- table the CLIENT writes it directly (subscribe/unsubscribe happen from the browser itself) —
-- same "for all using (auth.uid() = user_id)" pattern as user_meditation_history, the one other
-- user-writable generated table in this schema.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "manage own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
