-- Prodora schema for Supabase.
-- Run this in the SQL editor after creating a project.
-- The Next.js server uses the service role and still filters every query by organization.
-- Row Level Security stops the anon key from reading another supplier's private data.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  email text not null default '',
  notification_email text not null default '',
  phone text not null default '',
  address text not null default '',
  city text not null default '',
  pib text not null default '',
  mb text not null default '',
  logo_url text,
  brand_color text,
  cover_url text,
  description text not null default '',
  channel text not null default 'b2b' check (channel in ('b2c', 'b2b')),
  audience text not null default 'fizicka' check (audience in ('fizicka', 'pravna', 'oba')),
  order_prefix text not null default 'POR',
  next_order_number integer not null default 1001,
  active boolean not null default true,
  track_stock boolean not null default false,
  efaktura_api_key text not null default '',
  efaktura_enabled boolean not null default false,
  efaktura_environment text not null default 'demo' check (efaktura_environment in ('demo', 'produkcija')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  kind text not null default 'supplier' check (kind in ('supplier', 'buyer', 'platform')),
  business_name text not null default '',
  phone text not null default '',
  address text not null default '',
  city text not null default '',
  pib text not null default '',
  mb text not null default '',
  postal_code text not null default '',
  bank_account text not null default '',
  confirmation_email text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  sku text not null default '',
  description text not null default '',
  unit text not null check (unit in ('komad', 'paket', 'kutija', 'kilogram', 'litar')),
  price_para integer not null check (price_para > 0),
  sale_price_para integer,
  image_url text,
  image_urls text[] not null default '{}',
  active boolean not null default true,
  min_quantity numeric(12, 3) not null default 1 check (min_quantity > 0),
  stock_quantity numeric(12, 3) not null default 0 check (stock_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_sale_price_check check (sale_price_para is null or (sale_price_para > 0 and sale_price_para < price_para))
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null default '',
  pib text not null default '',
  address text not null default '',
  city text not null default '',
  notes text not null default '',
  code text not null default '',
  party text not null default 'fizicka' check (party in ('fizicka', 'pravna')),
  payment_term_days integer not null default 0 check (payment_term_days >= 0 and payment_term_days <= 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  buyer_user_id uuid references auth.users (id) on delete set null,
  number text not null,
  status text not null check (status in ('nova', 'potvrdjena', 'u_pripremi', 'isporucena', 'otkazana')),
  notes text not null default '',
  subtotal_para integer not null,
  total_para integer not null,
  idempotency_key text not null,
  confirmation_token text not null unique,
  customer_snapshot jsonb not null,
  customer_email_status text not null default 'pending',
  supplier_email_status text not null default 'pending',
  stock_held boolean not null default false,
  payment_method text check (payment_method is null or payment_method in ('pouzecem', 'ips', 'kartica', 'racun')),
  sef_invoice_id text,
  sef_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (organization_id, idempotency_key)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  sku text not null default '',
  unit text not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit_price_para integer not null,
  line_total_para integer not null
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  created_at timestamptz not null default now()
);

create index if not exists products_org_idx on public.products (organization_id);
create index if not exists orders_org_created_idx on public.orders (organization_id, created_at desc);
create index if not exists customers_org_email_idx on public.customers (organization_id, email);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists rate_limit_bucket_idx on public.rate_limit_events (bucket, created_at);

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.user_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.organization_members where user_id = auth.uid()
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.rate_limit_events enable row level security;

drop policy if exists organizations_member_select on public.organizations;
create policy organizations_member_select on public.organizations
for select using (id in (select public.user_organization_ids()));

drop policy if exists organizations_member_update on public.organizations;
create policy organizations_member_update on public.organizations
for update using (id in (select public.user_organization_ids()))
with check (id in (select public.user_organization_ids()));

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
for select using (id = auth.uid());

drop policy if exists members_select on public.organization_members;
create policy members_select on public.organization_members
for select using (organization_id in (select public.user_organization_ids()));

drop policy if exists categories_member on public.categories;
create policy categories_member on public.categories
for all using (organization_id in (select public.user_organization_ids()))
with check (organization_id in (select public.user_organization_ids()));

drop policy if exists products_member on public.products;
create policy products_member on public.products
for all using (organization_id in (select public.user_organization_ids()))
with check (organization_id in (select public.user_organization_ids()));

drop policy if exists customers_member on public.customers;
create policy customers_member on public.customers
for all using (organization_id in (select public.user_organization_ids()))
with check (organization_id in (select public.user_organization_ids()));

drop policy if exists orders_member on public.orders;
create policy orders_member on public.orders
for all using (organization_id in (select public.user_organization_ids()))
with check (organization_id in (select public.user_organization_ids()));

drop policy if exists order_items_member on public.order_items;
create policy order_items_member on public.order_items
for all using (organization_id in (select public.user_organization_ids()))
with check (organization_id in (select public.user_organization_ids()));

drop policy if exists history_member on public.order_status_history;
create policy history_member on public.order_status_history
for all using (organization_id in (select public.user_organization_ids()))
with check (organization_id in (select public.user_organization_ids()));

revoke all on public.rate_limit_events from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
for select using (bucket_id = 'product-images');

alter table public.organizations add column if not exists brand_color text;
alter table public.organizations add column if not exists channel text not null default 'b2b';
alter table public.organizations add column if not exists audience text not null default 'fizicka';
update public.organizations set audience = 'pravna' where channel = 'b2b' and audience = 'fizicka';
alter table public.organizations drop constraint if exists organizations_audience_check;
alter table public.organizations add constraint organizations_audience_check check (audience in ('fizicka', 'pravna', 'oba'));
alter table public.organizations drop constraint if exists organizations_channel_check;
alter table public.organizations add constraint organizations_channel_check check (channel in ('b2c', 'b2b'));

alter table public.profiles add column if not exists kind text not null default 'supplier';
alter table public.profiles add column if not exists business_name text not null default '';
alter table public.profiles add column if not exists phone text not null default '';
alter table public.profiles add column if not exists address text not null default '';
alter table public.profiles add column if not exists city text not null default '';
alter table public.profiles add column if not exists pib text not null default '';
alter table public.profiles add column if not exists bank_account text not null default '';
alter table public.profiles add column if not exists mb text not null default '';
alter table public.profiles add column if not exists postal_code text not null default '';
alter table public.profiles add column if not exists confirmation_email text not null default '';
alter table public.profiles drop constraint if exists profiles_kind_check;
alter table public.profiles add constraint profiles_kind_check check (kind in ('supplier', 'buyer', 'platform'));

alter table public.products add column if not exists sale_price_para integer;
alter table public.products drop constraint if exists products_sale_price_check;
alter table public.products add constraint products_sale_price_check
  check (sale_price_para is null or (sale_price_para > 0 and sale_price_para < price_para));

alter table public.products add column if not exists image_urls text[] not null default '{}';

alter table public.products add column if not exists stock_quantity numeric(12, 3) not null default 0;
alter table public.products drop constraint if exists products_stock_quantity_check;
alter table public.products add constraint products_stock_quantity_check check (stock_quantity >= 0);

alter table public.orders add column if not exists stock_held boolean not null default false;

alter table public.orders add column if not exists payment_method text;
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method is null or payment_method in ('pouzecem', 'ips', 'kartica', 'racun'));

alter table public.orders add column if not exists buyer_user_id uuid references auth.users (id) on delete set null;
create index if not exists orders_buyer_idx on public.orders (buyer_user_id);

drop policy if exists orders_buyer_select on public.orders;
create policy orders_buyer_select on public.orders
for select using (buyer_user_id = auth.uid());

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  monthly_price_para integer not null check (monthly_price_para >= 0),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id),
  status text not null check (status in ('aktivna', 'otkazana', 'istekla')),
  period_start timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_notes (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  number text not null unique,
  period_start timestamptz not null,
  period_end timestamptz not null,
  amount_para integer not null check (amount_para >= 0),
  status text not null check (status in ('placena', 'neplacena')),
  issued_at timestamptz not null default now()
);

create index if not exists platform_invoices_org_idx on public.platform_invoices (organization_id, issued_at desc);

drop trigger if exists subscription_plans_updated_at on public.subscription_plans;
create trigger subscription_plans_updated_at before update on public.subscription_plans
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();

alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.supplier_notes enable row level security;
alter table public.platform_invoices enable row level security;

drop policy if exists plans_authenticated_select on public.subscription_plans;
create policy plans_authenticated_select on public.subscription_plans
for select using (auth.role() = 'authenticated');

drop policy if exists subscriptions_member_select on public.subscriptions;
create policy subscriptions_member_select on public.subscriptions
for select using (organization_id in (select public.user_organization_ids()));

drop policy if exists invoices_member_select on public.platform_invoices;
create policy invoices_member_select on public.platform_invoices
for select using (organization_id in (select public.user_organization_ids()));

insert into public.subscription_plans (name, monthly_price_para, description)
values
  ('Osnovni', 199000, 'Katalog, porudžbine i stranica prodavnice.'),
  ('Poslovni', 499000, 'Veći katalog i prioritetna podrška.')
on conflict (name) do nothing;

alter table public.customers add column if not exists party text;
alter table public.customers add column if not exists payment_term_days integer;
update public.customers
set party = case when pib ~ '^[0-9]{9}$' then 'pravna' else 'fizicka' end
where party is null;
update public.customers
set payment_term_days = case when party = 'pravna' then 15 else 0 end
where payment_term_days is null;
alter table public.organizations add column if not exists track_stock boolean not null default false;
alter table public.organizations add column if not exists efaktura_api_key text not null default '';
alter table public.organizations add column if not exists efaktura_enabled boolean not null default false;
alter table public.organizations add column if not exists efaktura_environment text not null default 'demo';
do $$ begin
  alter table public.organizations add constraint organizations_efaktura_environment_check
    check (efaktura_environment in ('demo', 'produkcija'));
exception when duplicate_object then null;
end $$;
alter table public.orders add column if not exists sef_invoice_id text;
alter table public.orders add column if not exists sef_status text;

alter table public.organizations add column if not exists cover_url text;
alter table public.organizations add column if not exists description text not null default '';

alter table public.customers alter column party set default 'fizicka';
alter table public.customers alter column payment_term_days set default 0;
alter table public.customers alter column party set not null;
alter table public.customers alter column payment_term_days set not null;
alter table public.customers add column if not exists code text;
update public.customers as customer
set code = 'K-' || lpad((bases.base + numbered.rn)::text, 4, '0')
from (
  select id, organization_id, row_number() over (partition by organization_id order by created_at, id) as rn
  from public.customers
  where code is null or code = ''
) as numbered
join (
  select organization_id, coalesce(max(substring(code from '^K-([0-9]+)$')::int), 0) as base
  from public.customers
  group by organization_id
) as bases on bases.organization_id = numbered.organization_id
where customer.id = numbered.id;
alter table public.customers alter column code set default '';
alter table public.customers alter column code set not null;
create unique index if not exists customers_org_code_idx on public.customers (organization_id, code);
do $$ begin
  alter table public.customers add constraint customers_party_check check (party in ('fizicka', 'pravna'));
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table public.customers add constraint customers_payment_term_check check (payment_term_days >= 0 and payment_term_days <= 365);
exception when duplicate_object then null;
end $$;

insert into public.subscriptions (organization_id, plan_id, status, period_start)
select o.id, p.id, 'aktivna', date_trunc('month', now())
from public.organizations o
join public.subscription_plans p
  on p.name = case when o.slug in ('mesara-pajic', 'gastro-supply') then 'Poslovni' else 'Osnovni' end
where not exists (
  select 1 from public.subscriptions s where s.organization_id = o.id
);
