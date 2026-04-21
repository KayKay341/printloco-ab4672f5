
create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'customer',
  zip_code text,
  city text,
  notes text,
  source text,
  created_at timestamptz not null default now()
);
create unique index waitlist_email_role_idx on public.waitlist_signups (lower(email), role);
alter table public.waitlist_signups enable row level security;
create policy "Anyone can join waitlist" on public.waitlist_signups for insert to anon, authenticated with check (true);

create table public.investor_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  organization text,
  check_size text,
  message text,
  created_at timestamptz not null default now()
);
alter table public.investor_leads enable row level security;
create policy "Anyone can submit investor interest" on public.investor_leads for insert to anon, authenticated with check (true);

alter table public.orders add column if not exists pickup_code text;
