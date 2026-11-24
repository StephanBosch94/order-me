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
