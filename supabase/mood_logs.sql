-- Mood check-in logs for mental wellness feature
create table if not exists mood_logs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  primary_mood        text not null,
  severity            text check (severity in ('mild', 'moderate', 'high')) not null,
  insight             text,
  wellness_message    text,
  suggested_action    text,
  emoji               text,
  energy_level        integer check (energy_level between 1 and 5),
  emotional_state     text,
  physical_symptoms   text[],
  trigger_category    text,
  sleep_rating        integer check (sleep_rating between 1 and 5),
  recorded_at         timestamptz default now() not null
);

alter table mood_logs enable row level security;

create policy "Users manage own mood logs"
  on mood_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists mood_logs_user_date
  on mood_logs(user_id, recorded_at desc);
