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
