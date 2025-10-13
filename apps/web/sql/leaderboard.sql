create table if not exists public.leaderboard (
  id uuid default gen_random_uuid() primary key,
  game text not null,
  username text not null,
  score integer not null,
  created_at timestamptz default now()
);

alter table public.leaderboard enable row level security;

create policy "read leaderboard" on public.leaderboard
  for select
  using (true);

create policy "service insert leaderboard" on public.leaderboard
  for insert
  with check (true);
