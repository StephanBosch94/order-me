create unique index if not exists customers_org_email_unique
on public.customers (organization_id, lower(email));
