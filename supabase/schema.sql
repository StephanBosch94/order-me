-- Poruci schema for Supabase.
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
  order_prefix text not null default 'POR',
  next_order_number integer not null default 1001,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  kind text not null default 'supplier' check (kind in ('supplier', 'buyer')),
  business_name text not null default '',
  phone text not null default '',
  address text not null default '',
  city text not null default '',
  pib text not null default '',
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
  image_url text,
  active boolean not null default true,
  min_quantity numeric(12, 3) not null default 1 check (min_quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

alter table public.profiles add column if not exists kind text not null default 'supplier';
alter table public.profiles add column if not exists business_name text not null default '';
alter table public.profiles add column if not exists phone text not null default '';
alter table public.profiles add column if not exists address text not null default '';
alter table public.profiles add column if not exists city text not null default '';
alter table public.profiles add column if not exists pib text not null default '';
alter table public.profiles drop constraint if exists profiles_kind_check;
alter table public.profiles add constraint profiles_kind_check check (kind in ('supplier', 'buyer'));

alter table public.orders add column if not exists buyer_user_id uuid references auth.users (id) on delete set null;
create index if not exists orders_buyer_idx on public.orders (buyer_user_id);

drop policy if exists orders_buyer_select on public.orders;
create policy orders_buyer_select on public.orders
for select using (buyer_user_id = auth.uid());
