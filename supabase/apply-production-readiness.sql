create or replace function public.create_supplier_account(
  p_user_id uuid,
  p_user_name text,
  p_user_email text,
  p_name text,
  p_slug text,
  p_phone text,
  p_audience text,
  p_channel text,
  p_order_prefix text
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.organizations;
begin
  insert into public.organizations (
    name, slug, email, notification_email, phone, audience, channel,
    order_prefix, track_stock, public_store
  )
  values (
    trim(p_name), lower(trim(p_slug)), lower(trim(p_user_email)),
    lower(trim(p_user_email)), trim(p_phone), p_audience, p_channel,
    p_order_prefix, false, true
  )
  returning * into created;

  insert into public.profiles (id, email, name, kind)
  values (p_user_id, lower(trim(p_user_email)), trim(p_user_name), 'supplier')
  on conflict (id) do update
  set email = excluded.email, name = excluded.name, kind = 'supplier';

  insert into public.organization_members (organization_id, user_id, role)
  values (created.id, p_user_id, 'owner');

  insert into public.subscriptions (organization_id, plan_id, status, period_start)
  select created.id, plan.id, 'aktivna', now()
  from public.subscription_plans plan
  order by case when plan.name = 'Osnovni' then 0 else 1 end, plan.monthly_price_para
  limit 1
  on conflict (organization_id) do nothing;

  return created;
end;
$$;

revoke all on function public.create_supplier_account(uuid, text, text, text, text, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.create_supplier_account(uuid, text, text, text, text, text, text, text, text)
to service_role;

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  hits integer;
  cutoff timestamptz := now() - make_interval(secs => greatest(p_window_seconds, 1));
begin
  if p_bucket is null or length(p_bucket) < 3 or p_limit < 1 then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_bucket, 0));

  select count(*)::integer into hits
  from public.rate_limit_events
  where bucket = p_bucket and created_at >= cutoff;

  if hits >= p_limit then
    return false;
  end if;

  insert into public.rate_limit_events (bucket) values (p_bucket);

  if random() < 0.02 then
    delete from public.rate_limit_events where created_at < now() - interval '24 hours';
  end if;

  return true;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer)
to service_role;

create unique index if not exists customers_org_email_unique
on public.customers (organization_id, lower(email));

create table if not exists public.support_access_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  reason text not null check (char_length(reason) between 3 and 500),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists support_access_log_org_started_idx
on public.support_access_log (organization_id, started_at desc);

alter table public.support_access_log enable row level security;
revoke all on public.support_access_log from anon, authenticated;

-- Create a public order, its customer link, items, stock hold, and history in one transaction.
create or replace function public.create_public_order(
  p_organization_id uuid,
  p_idempotency_key text,
  p_buyer_user_id uuid,
  p_notes text,
  p_payment_method text,
  p_business_name text,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_pib text,
  p_mb text,
  p_address text,
  p_postal_code text,
  p_city text,
  p_bank_account text,
  p_confirmation_email text,
  p_subtotal_para integer,
  p_items jsonb,
  p_track_stock boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  org public.organizations;
  existing_order public.orders;
  customer_row public.customers;
  order_row public.orders;
  email_value text := lower(trim(p_email));
  next_code integer;
  customer_code text;
  party_value text;
  sequence integer;
  year_value text;
  order_number text;
  confirmation text := gen_random_uuid()::text;
  item jsonb;
  product_id uuid;
  qty numeric;
  stock_qty numeric;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key_required';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;

  select * into org from public.organizations where id = p_organization_id for update;
  if not found then
    raise exception 'organization_missing';
  end if;

  select * into existing_order
  from public.orders
  where organization_id = p_organization_id
    and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('duplicate', true, 'order_id', existing_order.id);
  end if;

  select * into customer_row
  from public.customers
  where organization_id = p_organization_id
    and lower(email) = email_value
  for update;

  if not found then
    select coalesce(max(nullif(substring(code from '^K-([0-9]+)$'), '')::integer), 0) + 1
      into next_code
    from public.customers
    where organization_id = p_organization_id;
    customer_code := 'K-' || lpad(next_code::text, 4, '0');
    party_value := case when coalesce(trim(p_pib), '') ~ '^[0-9]{9}$' then 'pravna' else 'fizicka' end;

    insert into public.customers (
      organization_id, business_name, contact_name, email, phone, pib, address, city,
      code, party, payment_term_days, sef_registered
    )
    values (
      p_organization_id,
      trim(p_business_name),
      trim(p_contact_name),
      email_value,
      trim(p_phone),
      coalesce(trim(p_pib), ''),
      trim(p_address),
      trim(p_city),
      customer_code,
      party_value,
      case when party_value = 'pravna' then 15 else 0 end,
      false
    )
    returning * into customer_row;
  elsif p_buyer_user_id is not null then
    update public.customers
    set
      business_name = trim(p_business_name),
      contact_name = trim(p_contact_name),
      phone = trim(p_phone),
      pib = case when coalesce(trim(p_pib), '') = '' then pib else trim(p_pib) end,
      address = case when coalesce(trim(p_address), '') = '' then address else trim(p_address) end,
      city = case when coalesce(trim(p_city), '') = '' then city else trim(p_city) end,
      updated_at = now()
    where id = customer_row.id
    returning * into customer_row;
  end if;

  sequence := org.next_order_number;
  year_value := to_char((now() at time zone 'Europe/Belgrade'), 'YYYY');
  order_number := org.order_prefix || '-' || year_value || '-' || lpad(sequence::text, 4, '0');

  update public.organizations
  set next_order_number = sequence + 1, updated_at = now()
  where id = p_organization_id
    and next_order_number = sequence;
  if not found then
    raise exception 'order_number_conflict';
  end if;

  insert into public.orders (
    organization_id,
    customer_id,
    number,
    status,
    notes,
    subtotal_para,
    total_para,
    idempotency_key,
    confirmation_token,
    customer_snapshot,
    buyer_user_id,
    payment_method,
    stock_held
  )
  values (
    p_organization_id,
    customer_row.id,
    order_number,
    'nova',
    coalesce(p_notes, ''),
    p_subtotal_para,
    p_subtotal_para,
    p_idempotency_key,
    confirmation,
    jsonb_build_object(
      'code', customer_row.code,
      'businessName', trim(p_business_name),
      'contactName', trim(p_contact_name),
      'email', email_value,
      'phone', trim(p_phone),
      'pib', coalesce(trim(p_pib), ''),
      'mb', coalesce(trim(p_mb), ''),
      'address', trim(p_address),
      'postalCode', coalesce(trim(p_postal_code), ''),
      'city', trim(p_city),
      'bankAccount', coalesce(trim(p_bank_account), ''),
      'confirmationEmail', coalesce(trim(p_confirmation_email), '')
    ),
    p_buyer_user_id,
    p_payment_method,
    coalesce(p_track_stock, false)
  )
  returning * into order_row;

  for item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id,
      organization_id,
      product_id,
      name,
      sku,
      unit,
      quantity,
      unit_price_para,
      line_total_para
    )
    values (
      order_row.id,
      p_organization_id,
      nullif(item->>'product_id', '')::uuid,
      item->>'name',
      coalesce(item->>'sku', ''),
      item->>'unit',
      (item->>'quantity')::numeric,
      (item->>'unit_price_para')::integer,
      (item->>'line_total_para')::integer
    );

    if coalesce(p_track_stock, false) and nullif(item->>'product_id', '') is not null then
      product_id := (item->>'product_id')::uuid;
      qty := (item->>'quantity')::numeric;
      select stock_quantity into stock_qty
      from public.products
      where id = product_id
        and organization_id = p_organization_id
      for update;
      if found then
        update public.products
        set
          stock_quantity = greatest(0, stock_qty - qty),
          updated_at = now()
        where id = product_id
          and organization_id = p_organization_id;
      end if;
    end if;
  end loop;

  insert into public.order_status_history (
    order_id, organization_id, from_status, to_status, actor_name
  )
  values (order_row.id, p_organization_id, null, 'nova', 'Kupac');

  return jsonb_build_object('duplicate', false, 'order_id', order_row.id);
exception
  when unique_violation then
    select * into existing_order
    from public.orders
    where organization_id = p_organization_id
      and idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('duplicate', true, 'order_id', existing_order.id);
    end if;
    raise;
end;
$$;

revoke all on function public.create_public_order(
  uuid, text, uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, integer, jsonb, boolean
) from public, anon, authenticated;
grant execute on function public.create_public_order(
  uuid, text, uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, integer, jsonb, boolean
) to service_role;
