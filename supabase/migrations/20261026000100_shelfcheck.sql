begin;

create table public.saved_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null check (char_length(product_name) between 1 and 200),
  decision text not null check (decision in ('hold','consider','skip','needs_more_info')),
  summary text not null check (char_length(summary) between 1 and 20000),
  created_at timestamptz not null default now()
);
create index saved_decisions_owner_date on public.saved_decisions(user_id, created_at desc);
alter table public.saved_decisions enable row level security;
revoke all on public.saved_decisions from anon, authenticated;
grant select, insert, delete on public.saved_decisions to authenticated;
create policy "Read own saved decisions" on public.saved_decisions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Save own decisions" on public.saved_decisions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Delete own decisions" on public.saved_decisions for delete to authenticated using ((select auth.uid()) = user_id);

-- No photos or scan scores are stored. Only short-lived task references.
-- Browsers have no direct access; the authenticated Edge Function checks ownership.
create table public.scan_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_task_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  last_polled_at timestamptz
);
create index scan_jobs_owner_date on public.scan_jobs(user_id,created_at desc);
create index scan_jobs_expiry on public.scan_jobs(expires_at);
alter table public.scan_jobs enable row level security;
revoke all on public.scan_jobs from anon,authenticated;
grant all on public.scan_jobs to service_role;
grant all on public.saved_decisions to service_role;

-- Serialize per-user scan reservations so concurrent requests cannot bypass quota.
create function public.reserve_scan(p_user_id uuid,p_job_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  if exists (select 1 from public.scan_jobs where user_id=p_user_id and created_at > now()-interval '60 seconds') then
    return false;
  end if;
  insert into public.scan_jobs(id,user_id) values (p_job_id,p_user_id);
  return true;
end;
$$;
revoke all on function public.reserve_scan(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_scan(uuid,uuid) to service_role;

-- Provider polling is rate-limited in PostgreSQL, across Edge Function instances.
create function public.claim_scan_poll(p_user_id uuid,p_job_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare task_id text;
begin
  update public.scan_jobs set last_polled_at=now()
  where id=p_job_id and user_id=p_user_id and expires_at>now()
    and (last_polled_at is null or last_polled_at<now()-interval '9 seconds')
  returning provider_task_id into task_id;
  return task_id;
end;
$$;
revoke all on function public.claim_scan_poll(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_scan_poll(uuid,uuid) to service_role;
commit;
