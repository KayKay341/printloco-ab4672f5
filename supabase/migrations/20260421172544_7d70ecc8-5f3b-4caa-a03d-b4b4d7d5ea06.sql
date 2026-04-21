-- Enum for user roles
create type public.user_role as enum ('customer', 'maker');

-- Profiles table (linked to auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'customer',
  neighborhood text,
  zip_code text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Printers
create table public.printers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  brand text not null,
  model text not null,
  build_volume text,
  materials text[] not null default '{}',
  price_per_gram numeric(10,2) not null default 0.20,
  neighborhood text,
  zip_code text,
  bio text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.printers enable row level security;

create policy "Printers are viewable by everyone"
  on public.printers for select
  using (true);

create policy "Makers can insert their own printers"
  on public.printers for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'maker'
    )
  );

create policy "Makers can update their own printers"
  on public.printers for update
  using (auth.uid() = owner_id);

create policy "Makers can delete their own printers"
  on public.printers for delete
  using (auth.uid() = owner_id);

create trigger printers_updated_at
  before update on public.printers
  for each row execute function public.set_updated_at();

-- STL files / quotes
create table public.stl_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint not null,
  material text not null default 'PLA',
  estimated_weight numeric(10,2),
  estimated_price numeric(10,2),
  created_at timestamptz not null default now()
);

alter table public.stl_files enable row level security;

create policy "Users can view their own STL files"
  on public.stl_files for select
  using (auth.uid() = user_id);

create policy "Users can insert their own STL files"
  on public.stl_files for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own STL files"
  on public.stl_files for delete
  using (auth.uid() = user_id);

-- Storage bucket for STL files (private)
insert into storage.buckets (id, name, public)
values ('stl-files', 'stl-files', false);

create policy "Users can upload their own STL files"
  on storage.objects for insert
  with check (
    bucket_id = 'stl-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read their own STL files"
  on storage.objects for select
  using (
    bucket_id = 'stl-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own STL files"
  on storage.objects for delete
  using (
    bucket_id = 'stl-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );