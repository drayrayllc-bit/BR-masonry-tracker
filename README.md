# Baton Rouge Masonry Tracker

Mobile-first daily production log app for the Baton Rouge State Capitol masonry work.

## What is included

- React + Vite app
- Light iOS-style mobile UI
- Supabase submission to `public.daily_logs`
- Local Excel export button
- Floor wheel: C18 through C115
- Crew size wheel
- Hours wheel in 0.25-hour increments
- Typed quantity input
- North / South / East / West selector
- Stone checklist generator, e.g. C48-S1 through C48-S19

## Setup

1. Unzip this folder.
2. Open the folder in VS Code, StackBlitz, or another code editor.
3. Copy `.env.example` and rename the copy to `.env`.
4. In `.env`, paste your Supabase publishable key:

```txt
VITE_SUPABASE_URL=https://wsctkmxgvvectlvwnhsi.supabase.co
VITE_SUPABASE_ANON_KEY=PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE
```

Do not use your Supabase secret key in this app.

## Install and run

```bash
npm install
npm run dev
```

## Supabase table needed

Run this in Supabase SQL Editor if the table does not already exist:

```sql
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  log_date date not null,
  foreman text not null,
  crew_size integer not null,
  entry_number integer not null,
  task text not null,
  elevation text,
  floor text not null,
  quantity numeric not null,
  unit text not null,
  hours numeric not null,
  man_hours numeric not null,
  production_rate numeric,
  stone_numbers text,
  notes text,
  project text default 'Baton Rouge State Capitol'
);

alter table public.daily_logs enable row level security;

drop policy if exists "Allow field log inserts" on public.daily_logs;

create policy "Allow field log inserts"
on public.daily_logs
for insert
to anon
with check (true);
```

## Deploy

Recommended: deploy to Vercel.

Add these environment variables in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then field users can open the link on iPhone Safari and use Share > Add to Home Screen.
