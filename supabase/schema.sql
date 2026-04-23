-- medicines table
create table if not exists public.medicines (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  dosage          text,
  quantity        integer not null default 0,
  expiry_date     text,
  category        text,
  refill_alert_at integer not null default 5,
  created_at      timestamptz not null default now()
);

-- Row Level Security: users can only see/edit their own medicines
alter table public.medicines enable row level security;

create policy "select own medicines"
  on public.medicines for select
  using (auth.uid() = user_id);

create policy "insert own medicines"
  on public.medicines for insert
  with check (auth.uid() = user_id);

create policy "update own medicines"
  on public.medicines for update
  using (auth.uid() = user_id);

create policy "delete own medicines"
  on public.medicines for delete
  using (auth.uid() = user_id);
