-- Gift cards table
create table public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  original_amount_cents integer not null check (original_amount_cents >= 500 and original_amount_cents <= 50000000),
  remaining_amount_cents integer not null check (remaining_amount_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending','active','redeemed','refunded','cancelled')),
  purchaser_user_id uuid references auth.users(id) on delete set null,
  purchaser_email text not null,
  recipient_email text,
  recipient_name text,
  sender_name text,
  personal_message text,
  delivery_method text not null default 'buyer' check (delivery_method in ('buyer','recipient')),
  scheduled_send_at timestamptz,
  delivered_at timestamptz,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  environment text not null default 'sandbox',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_gift_cards_purchaser on public.gift_cards(purchaser_user_id);
create index idx_gift_cards_recipient_email on public.gift_cards(lower(recipient_email));
create index idx_gift_cards_session on public.gift_cards(stripe_session_id);
create index idx_gift_cards_status on public.gift_cards(status);

create trigger gift_cards_updated_at
before update on public.gift_cards
for each row execute function public.set_updated_at();

alter table public.gift_cards enable row level security;

-- Purchaser sees their own purchases
create policy "Purchaser views own gift cards"
on public.gift_cards for select
using (auth.uid() = purchaser_user_id);

-- Recipient (signed in with the recipient email) sees cards addressed to them
create policy "Recipient views cards sent to their email"
on public.gift_cards for select
using (
  recipient_email is not null
  and lower(recipient_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);

-- Admins view all
create policy "Admins view all gift cards"
on public.gift_cards for select
using (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage cards (manual issue, refund, cancel)
create policy "Admins manage gift cards"
on public.gift_cards for all
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- Redemptions
create table public.gift_card_redemptions (
  id uuid primary key default gen_random_uuid(),
  gift_card_id uuid not null references public.gift_cards(id) on delete cascade,
  redeemed_by_user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);

create index idx_gcr_card on public.gift_card_redemptions(gift_card_id);
create index idx_gcr_user on public.gift_card_redemptions(redeemed_by_user_id);

alter table public.gift_card_redemptions enable row level security;

create policy "Users view own redemptions"
on public.gift_card_redemptions for select
using (auth.uid() = redeemed_by_user_id);

create policy "Admins view all redemptions"
on public.gift_card_redemptions for select
using (has_role(auth.uid(), 'admin'::app_role));

-- Account credit balances
create table public.account_credit_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_cents integer not null default 0 check (balance_cents >= 0),
  currency text not null default 'usd',
  updated_at timestamptz not null default now()
);

alter table public.account_credit_balances enable row level security;

create policy "Users view own balance"
on public.account_credit_balances for select
using (auth.uid() = user_id);

create policy "Admins view balances"
on public.account_credit_balances for select
using (has_role(auth.uid(), 'admin'::app_role));

create trigger account_credit_balances_updated_at
before update on public.account_credit_balances
for each row execute function public.set_updated_at();

-- Atomic redemption function
create or replace function public.redeem_gift_card(_code text)
returns table(
  redeemed_amount_cents integer,
  new_balance_cents integer,
  gift_card_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.gift_cards%rowtype;
  v_user uuid := auth.uid();
  v_amount integer;
  v_new_balance integer;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if _code is null or length(btrim(_code)) = 0 then
    raise exception 'Code is required' using errcode = '22023';
  end if;

  select * into v_card
  from public.gift_cards
  where code = upper(btrim(_code))
  for update;

  if not found then
    raise exception 'Gift card not found' using errcode = 'P0002';
  end if;

  if v_card.status not in ('active') then
    raise exception 'Gift card is not redeemable (status: %)', v_card.status using errcode = '22023';
  end if;

  if v_card.remaining_amount_cents <= 0 then
    raise exception 'Gift card has no remaining balance' using errcode = '22023';
  end if;

  v_amount := v_card.remaining_amount_cents;

  -- Mark card as fully redeemed
  update public.gift_cards
  set remaining_amount_cents = 0,
      status = 'redeemed',
      updated_at = now()
  where id = v_card.id;

  -- Record redemption
  insert into public.gift_card_redemptions (gift_card_id, redeemed_by_user_id, amount_cents)
  values (v_card.id, v_user, v_amount);

  -- Upsert balance
  insert into public.account_credit_balances (user_id, balance_cents, currency)
  values (v_user, v_amount, v_card.currency)
  on conflict (user_id) do update
    set balance_cents = public.account_credit_balances.balance_cents + excluded.balance_cents,
        updated_at = now()
  returning balance_cents into v_new_balance;

  redeemed_amount_cents := v_amount;
  new_balance_cents := v_new_balance;
  gift_card_id := v_card.id;
  return next;
end;
$$;

grant execute on function public.redeem_gift_card(text) to authenticated;