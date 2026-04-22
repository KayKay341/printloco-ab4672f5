-- 1. Auto-grant admin to the project owner on signup, and seed it now if the user already exists.
create or replace function public.grant_owner_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) = 'kaydenaminshah@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_grant_owner_admin on auth.users;
create trigger trg_grant_owner_admin
after insert on auth.users
for each row execute function public.grant_owner_admin();

-- Seed admin for the existing account if they've already signed up.
insert into public.user_roles (user_id, role)
select id, 'admin'::app_role
from auth.users
where lower(email) = 'kaydenaminshah@gmail.com'
on conflict do nothing;

-- 2. Lock down the public bootstrap RPC so nobody else can claim admin.
create or replace function public.claim_first_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Disabled: admin is granted only to the project owner via trigger above.
  return false;
end;
$$;

-- 3. Editable headline metrics (admin-only writes, public reads).
create table if not exists public.app_metrics (
  key text primary key,
  value_number numeric,
  value_text text,
  label text,
  updated_at timestamptz not null default now()
);

alter table public.app_metrics enable row level security;

drop policy if exists "Metrics readable by everyone" on public.app_metrics;
create policy "Metrics readable by everyone"
  on public.app_metrics for select
  using (true);

drop policy if exists "Admins write metrics" on public.app_metrics;
create policy "Admins write metrics"
  on public.app_metrics for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Seed defaults so the landing page renders sensible numbers immediately.
insert into public.app_metrics (key, value_number, value_text, label) values
  ('waitlist_target',       2500,    null,           'Waitlist target signups'),
  ('cities_target',         25,      null,           'Cities targeted at launch'),
  ('avg_match_minutes',     null,    '< 1 wk',       'Average wait until your zip is live'),
  ('raise_target_cents',    250000000, null,         'Seed round target ($)'),
  ('raise_committed_cents', 87500000,  null,         'Seed round committed ($)'),
  ('platform_fee_pct',      10,      null,           'Platform fee %'),
  ('avg_cost_per_gram',     null,    '$0.18',        'Average cost per gram'),
  ('savings_multiple',      null,    '10×',          'Cheaper than legacy services')
on conflict (key) do nothing;

-- 4. Allow admins to manually override city signup counts.
drop policy if exists "Admins update cities" on public.cities;
create policy "Admins update cities"
  on public.cities for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Refresh PostgREST schema cache so the table is immediately queryable.
notify pgrst, 'reload schema';
