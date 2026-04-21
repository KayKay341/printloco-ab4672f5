-- ============== PRINTER PRESETS ==============
create table public.printer_presets (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  build_volume text not null,
  materials text[] not null default '{}',
  suggested_prices jsonb not null default '{}'::jsonb,
  image_url text,
  popularity int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.printer_presets enable row level security;
create policy "Presets are viewable by everyone" on public.printer_presets for select using (true);

insert into public.printer_presets (brand, model, build_volume, materials, suggested_prices, popularity) values
('Bambu Lab', 'A1', '256x256x256mm', array['PLA','PETG','TPU'], '{"PLA":0.15,"PETG":0.20,"TPU":0.40}'::jsonb, 100),
('Bambu Lab', 'A1 Mini', '180x180x180mm', array['PLA','PETG','TPU'], '{"PLA":0.15,"PETG":0.20,"TPU":0.40}'::jsonb, 95),
('Bambu Lab', 'X1 Carbon', '256x256x256mm', array['PLA','PETG','ABS','ASA','PA','PC','TPU'], '{"PLA":0.18,"PETG":0.22,"ABS":0.28,"ASA":0.30,"PA":0.50,"PC":0.45,"TPU":0.40}'::jsonb, 98),
('Bambu Lab', 'P1S', '256x256x256mm', array['PLA','PETG','ABS','ASA','TPU'], '{"PLA":0.16,"PETG":0.20,"ABS":0.25,"ASA":0.28,"TPU":0.40}'::jsonb, 92),
('Bambu Lab', 'P1P', '256x256x256mm', array['PLA','PETG','TPU'], '{"PLA":0.15,"PETG":0.20,"TPU":0.40}'::jsonb, 85),
('Bambu Lab', 'H2D', '350x320x325mm', array['PLA','PETG','ABS','ASA','PA','PC','TPU'], '{"PLA":0.20,"PETG":0.25,"ABS":0.30,"ASA":0.32,"PA":0.55,"PC":0.50,"TPU":0.45}'::jsonb, 80),
('Prusa Research', 'MK4S', '250x210x220mm', array['PLA','PETG','ABS','ASA','TPU','PA'], '{"PLA":0.18,"PETG":0.22,"ABS":0.28,"ASA":0.30,"TPU":0.40,"PA":0.50}'::jsonb, 90),
('Prusa Research', 'MK3S+', '250x210x210mm', array['PLA','PETG','ABS','ASA','TPU'], '{"PLA":0.17,"PETG":0.21,"ABS":0.27,"ASA":0.29,"TPU":0.40}'::jsonb, 70),
('Prusa Research', 'XL', '360x360x360mm', array['PLA','PETG','ABS','ASA','PA','PC','TPU'], '{"PLA":0.22,"PETG":0.26,"ABS":0.32,"ASA":0.34,"PA":0.55,"PC":0.50,"TPU":0.45}'::jsonb, 75),
('Prusa Research', 'Mini+', '180x180x180mm', array['PLA','PETG','TPU'], '{"PLA":0.16,"PETG":0.20,"TPU":0.40}'::jsonb, 60),
('Creality', 'Ender 3 V3 SE', '220x220x250mm', array['PLA','PETG','TPU'], '{"PLA":0.12,"PETG":0.18,"TPU":0.35}'::jsonb, 78),
('Creality', 'K1 Max', '300x300x300mm', array['PLA','PETG','ABS','ASA','TPU'], '{"PLA":0.15,"PETG":0.20,"ABS":0.25,"ASA":0.28,"TPU":0.40}'::jsonb, 72),
('Creality', 'Ender 3 V2', '220x220x250mm', array['PLA','PETG'], '{"PLA":0.10,"PETG":0.15}'::jsonb, 65),
('Voron', '2.4', '350x350x350mm', array['PLA','PETG','ABS','ASA','PA','PC','TPU'], '{"PLA":0.20,"PETG":0.25,"ABS":0.30,"ASA":0.32,"PA":0.55,"PC":0.50,"TPU":0.45}'::jsonb, 70),
('Voron', 'Trident', '300x300x300mm', array['PLA','PETG','ABS','ASA','TPU'], '{"PLA":0.20,"PETG":0.25,"ABS":0.30,"ASA":0.32,"TPU":0.45}'::jsonb, 60),
('Ultimaker', 'S5', '330x240x300mm', array['PLA','PETG','ABS','PA','TPU','PVA'], '{"PLA":0.25,"PETG":0.30,"ABS":0.35,"PA":0.60,"TPU":0.50,"PVA":0.80}'::jsonb, 55),
('Ultimaker', 'S3', '230x190x200mm', array['PLA','PETG','ABS','PA','TPU','PVA'], '{"PLA":0.24,"PETG":0.28,"ABS":0.33,"PA":0.58,"TPU":0.48,"PVA":0.78}'::jsonb, 50),
('Anycubic', 'Kobra 3', '250x250x260mm', array['PLA','PETG','TPU'], '{"PLA":0.13,"PETG":0.18,"TPU":0.38}'::jsonb, 65),
('Anycubic', 'Photon Mono M5s', '218x123x200mm', array['Resin'], '{"Resin":0.55}'::jsonb, 70),
('Elegoo', 'Saturn 4 Ultra', '218x123x220mm', array['Resin'], '{"Resin":0.55}'::jsonb, 75),
('Elegoo', 'Mars 5 Pro', '153x77x165mm', array['Resin'], '{"Resin":0.55}'::jsonb, 65),
('Formlabs', 'Form 4', '200x125x210mm', array['Resin','Tough Resin','Flexible Resin'], '{"Resin":0.80,"Tough Resin":0.95,"Flexible Resin":1.00}'::jsonb, 60),
('FlashForge', 'Adventurer 5M Pro', '220x220x220mm', array['PLA','PETG','TPU'], '{"PLA":0.15,"PETG":0.20,"TPU":0.40}'::jsonb, 55),
('Snapmaker', 'Artisan', '400x400x400mm', array['PLA','PETG','ABS','TPU'], '{"PLA":0.22,"PETG":0.26,"ABS":0.30,"TPU":0.45}'::jsonb, 40);

-- ============== EXTEND PRINTERS ==============
alter table public.printers
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists is_address_verified boolean not null default false,
  add column if not exists image_url text,
  add column if not exists material_prices jsonb not null default '{}'::jsonb,
  add column if not exists preset_id uuid references public.printer_presets(id);

-- ============== EXTEND PROFILES ==============
alter table public.profiles
  add column if not exists stripe_account_id text,
  add column if not exists avatar_url text;

-- ============== CONVERSATIONS ==============
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  maker_id uuid not null,
  printer_id uuid references public.printers(id) on delete set null,
  stl_file_id uuid references public.stl_files(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (customer_id, maker_id, printer_id)
);
alter table public.conversations enable row level security;

create policy "Participants can view their conversations" on public.conversations
  for select using (auth.uid() = customer_id or auth.uid() = maker_id);

create policy "Customers can create conversations" on public.conversations
  for insert with check (auth.uid() = customer_id);

create policy "Participants can update their conversations" on public.conversations
  for update using (auth.uid() = customer_id or auth.uid() = maker_id);

-- ============== MESSAGES ==============
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;

create policy "Participants can view messages" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (auth.uid() = c.customer_id or auth.uid() = c.maker_id)
    )
  );

create policy "Participants can send messages" on public.messages
  for insert with check (
    auth.uid() = sender_id and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (auth.uid() = c.customer_id or auth.uid() = c.maker_id)
    )
  );

create index idx_messages_conversation on public.messages(conversation_id, created_at);

-- bump conversation last_message_at
create or replace function public.bump_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end;
$$;

create trigger trg_bump_conv after insert on public.messages
  for each row execute function public.bump_conversation_last_message();

-- ============== ORDERS ==============
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  maker_id uuid not null,
  printer_id uuid references public.printers(id) on delete set null,
  stl_file_id uuid references public.stl_files(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  material text not null,
  quantity int not null default 1,
  amount_total int not null,
  platform_fee int not null default 0,
  currency text not null default 'usd',
  status text not null default 'pending',
  stripe_session_id text,
  stripe_payment_intent_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;

create policy "Participants can view their orders" on public.orders
  for select using (auth.uid() = customer_id or auth.uid() = maker_id);

create policy "Customers can insert their orders" on public.orders
  for insert with check (auth.uid() = customer_id);

create policy "Participants can update their orders" on public.orders
  for update using (auth.uid() = customer_id or auth.uid() = maker_id);

create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- ============== REALTIME ==============
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.orders;