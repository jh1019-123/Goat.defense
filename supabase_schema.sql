-- ============================================================================
-- Bastion Siege 3D : Supabase (PostgreSQL) Leaderboard & Progression Schema
-- ============================================================================

-- 1. 사용자 프로필 및 재화/해금 정보 테이블
create table if not exists public.player_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  crystals integer not null default 0 check (crystals >= 0),
  unlocked_skins text[] not null default '{}',
  equipped_skins jsonb not null default '{}'::jsonb,
  unlocked_skills text[] not null default '{}',
  best_wave integer not null default 0 check (best_wave >= 0),
  total_kills integer not null default 0 check (total_kills >= 0),
  games_played integer not null default 0 check (games_played >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. 실시간 최고 웨이브 리더보드 테이블
create table if not exists public.wave_leaderboard (
  user_id uuid primary key references public.player_profiles(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  best_wave integer not null default 0 check (best_wave >= 0),
  total_kills integer not null default 0 check (total_kills >= 0),
  bosses_defeated integer not null default 0 check (bosses_defeated >= 0),
  achieved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 최고 웨이브 기준 내림차순 조회 최적화 인덱스
create index if not exists idx_wave_leaderboard_best_wave
  on public.wave_leaderboard (best_wave desc, total_kills desc, updated_at asc);

-- 3. 최고 웨이브 자동 갱신 RPC 함수 (역전/다운그레이드 방지)
create or replace function public.submit_wave_record(
  p_display_name text,
  p_wave integer,
  p_kills integer,
  p_bosses integer
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.wave_leaderboard (user_id, display_name, best_wave, total_kills, bosses_defeated)
  values (auth.uid(), p_display_name, p_wave, p_kills, p_bosses)
  on conflict (user_id) do update
  set
    display_name = excluded.display_name,
    best_wave = greatest(public.wave_leaderboard.best_wave, excluded.best_wave),
    total_kills = public.wave_leaderboard.total_kills + excluded.total_kills,
    bosses_defeated = public.wave_leaderboard.bosses_defeated + excluded.bosses_defeated,
    achieved_at = case
      when excluded.best_wave > public.wave_leaderboard.best_wave then now()
      else public.wave_leaderboard.achieved_at
    end,
    updated_at = now();
end;
$$;

-- 4. Row Level Security (RLS) 정책
alter table public.player_profiles enable row level security;
alter table public.wave_leaderboard enable row level security;

create policy "Users can view own profile"
  on public.player_profiles for select
  using (auth.uid() = id);

create policy "Users can upsert own profile"
  on public.player_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Leaderboard is publicly readable"
  on public.wave_leaderboard for select
  using (true);

create policy "Users can update own leaderboard row"
  on public.wave_leaderboard for insert
  with check (auth.uid() = user_id);

create policy "Users can modify own leaderboard row"
  on public.wave_leaderboard for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Supabase Realtime 활성화
alter publication supabase_realtime add table public.wave_leaderboard;
