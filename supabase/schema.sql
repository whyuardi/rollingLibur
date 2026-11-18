-- ============================================================
-- Rolling Libur MagangHub — skema Supabase (Postgres)
-- Jalankan seluruh file ini di Supabase Dashboard > SQL Editor.
-- ============================================================

create table if not exists public.participants (
  id text primary key,
  name text not null,
  division text not null check (division in ('Mobile', 'Web', 'Analyst')),
  sort_order int not null default 0
);

create table if not exists public.assignments (
  participant_id text not null references public.participants (id) on delete cascade,
  week_start date not null,
  off_day text not null check (off_day in ('fri', 'sat')),
  primary key (participant_id, week_start)
);

create index if not exists assignments_week_idx
  on public.assignments (week_start);

-- ============================================================
-- Row Level Security (RLS)
-- Proyek ini internal kecil dan tanpa login/auth: semua operasi
-- diizinkan untuk role anon (kunci publik Supabase). Kunci anon
-- memang dirancang untuk dipakai di client, tapi siapapun yang
-- punya URL + anon key bisa membaca/mengubah jadwal ini.
-- Kalau nanti butuh pembatasan, tambahkan Supabase Auth dan
-- ganti policy `using (true)` di bawah dengan aturan per-user.
-- ============================================================
alter table public.participants enable row level security;
alter table public.assignments enable row level security;

drop policy if exists "participants_anon_all" on public.participants;
create policy "participants_anon_all" on public.participants
  for all to anon using (true) with check (true);

drop policy if exists "assignments_anon_all" on public.assignments;
create policy "assignments_anon_all" on public.assignments
  for all to anon using (true) with check (true);

-- ============================================================
-- Data awal: 14 peserta placeholder (nama bisa diedit di web).
-- Aman dijalankan ulang: baris yang sudah ada tidak ditimpa.
-- ============================================================
insert into public.participants (id, name, division, sort_order) values
  ('mobile-1', 'Peserta Mobile 1', 'Mobile', 1),
  ('mobile-2', 'Peserta Mobile 2', 'Mobile', 2),
  ('mobile-3', 'Peserta Mobile 3', 'Mobile', 3),
  ('mobile-4', 'Peserta Mobile 4', 'Mobile', 4),
  ('mobile-5', 'Peserta Mobile 5', 'Mobile', 5),
  ('mobile-6', 'Peserta Mobile 6', 'Mobile', 6),
  ('web-1', 'Peserta Web 1', 'Web', 7),
  ('web-2', 'Peserta Web 2', 'Web', 8),
  ('web-3', 'Peserta Web 3', 'Web', 9),
  ('web-4', 'Peserta Web 4', 'Web', 10),
  ('web-5', 'Peserta Web 5', 'Web', 11),
  ('web-6', 'Peserta Web 6', 'Web', 12),
  ('analyst-1', 'Peserta Analyst 1', 'Analyst', 13),
  ('analyst-2', 'Peserta Analyst 2', 'Analyst', 14)
on conflict (id) do nothing;
