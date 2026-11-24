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
