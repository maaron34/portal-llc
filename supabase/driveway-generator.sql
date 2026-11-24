-- Driveway Generator: jobs, the daily counter, and the three atomic steps that
-- protect the image budget. Run once in the Supabase SQL editor for the Portal
-- project BEFORE setting DRIVEWAY_GENERATOR_ENABLED. Safe to run twice.
--
-- Nothing here is readable from the browser: row-level security is on with no
-- policies, and the functions are callable only with the secret (service) key,
-- which only the Netlify functions hold.
--
-- The money guarantee, in one place:
--   * every paid image call is counted in driveway_days.calls BEFORE it is made
--   * the count only goes up through
--       update driveway_days set calls = calls + 1 where day = ... and calls < cap
--     Postgres takes a row lock for that statement, so two requests at the same
--     instant run it one after the other and the second sees the first's count.
--     calls can never pass cap.
--   * a count is never given back, even when the call fails. Spend <= calls <= cap.

create table if not exists public.driveway_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  day date not null,
  idem_key uuid not null unique,
  lead_id uuid not null,
  phone10 text not null,
  ip_hash text not null,
  job_type text not null,
  width integer not null,
  height integer not null,
  input_path text not null,
  result_path text,
  status text not null default 'queued' check (status in ('queued', 'working', 'done', 'failed')),
  calls integer not null default 1 check (calls between 1 and 2),
  claimed_at timestamptz,
  outcome text check (outcome in ('ok', 'moved', 'error', 'timeout')),
  detail jsonb not null default '{}'::jsonb
);
create index if not exists driveway_jobs_phone_day on public.driveway_jobs (phone10, day);
create index if not exists driveway_jobs_ip_day on public.driveway_jobs (ip_hash, day);
create index if not exists driveway_jobs_lead on public.driveway_jobs (lead_id);

create table if not exists public.driveway_days (
  day date primary key,
  calls integer not null default 0 check (calls >= 0)
);

alter table public.driveway_jobs enable row level security;
alter table public.driveway_days enable row level security;

-- Portal's day turns over at midnight in Seattle.
create or replace function public.driveway_today() returns date
language sql stable as $$ select (now() at time zone 'America/Los_Angeles')::date $$;

-- Start a job. One transaction: all starts queue behind one lock (traffic is a
-- few dozen a day), so the limit checks and the insert cannot interleave.
create or replace function public.driveway_start(
  p_idem_key uuid,
  p_lead_id uuid,
  p_phone10 text,
  p_ip_hash text,
  p_job_type text,
  p_width integer,
  p_height integer,
  p_input_path text,
  p_daily_cap integer,
  p_per_phone integer,
  p_per_ip integer
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_today date := driveway_today();
  v_job driveway_jobs;
begin
  perform pg_advisory_xact_lock(hashtext('driveway_start'));

  select * into v_job from driveway_jobs where idem_key = p_idem_key;
  if found then
    return jsonb_build_object('ok', true, 'existing', true, 'job', to_jsonb(v_job));
  end if;

  if (select count(*) from driveway_jobs where phone10 = p_phone10 and day = v_today) >= p_per_phone then
    return jsonb_build_object('ok', false, 'reason', 'phone');
  end if;
  if (select count(*) from driveway_jobs where ip_hash = p_ip_hash and day = v_today) >= p_per_ip then
    return jsonb_build_object('ok', false, 'reason', 'ip');
  end if;

  insert into driveway_days (day) values (v_today) on conflict (day) do nothing;
  update driveway_days set calls = calls + 1 where day = v_today and calls < p_daily_cap;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'cap');
  end if;

  insert into driveway_jobs (day, idem_key, lead_id, phone10, ip_hash, job_type, width, height, input_path)
  values (v_today, p_idem_key, p_lead_id, p_phone10, p_ip_hash, p_job_type, p_width, p_height, p_input_path)
  returning * into v_job;
  return jsonb_build_object('ok', true, 'existing', false, 'job', to_jsonb(v_job));
end $$;

-- The worker takes a job. Only one caller ever gets the row back.
create or replace function public.driveway_claim(p_job uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_job driveway_jobs;
begin
  update driveway_jobs set status = 'working', claimed_at = now(), updated_at = now()
  where id = p_job and status = 'queued'
  returning * into v_job;
  if not found then return null; end if;
  return to_jsonb(v_job);
end $$;

-- Reserve the job's second and last image call. False when the job already
-- used it, is no longer working, or the day is full.
create or replace function public.driveway_reserve_retry(p_job uuid, p_daily_cap integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_today date := driveway_today();
  v_calls integer;
begin
  select calls into v_calls from driveway_jobs where id = p_job and status = 'working' for update;
  if not found or v_calls <> 1 then return false; end if;

  insert into driveway_days (day) values (v_today) on conflict (day) do nothing;
  update driveway_days set calls = calls + 1 where day = v_today and calls < p_daily_cap;
  if not found then return false; end if;

  update driveway_jobs set calls = 2, updated_at = now() where id = p_job;
  return true;
end $$;

revoke all on function public.driveway_start(uuid, uuid, text, text, text, integer, integer, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.driveway_claim(uuid) from public, anon, authenticated;
revoke all on function public.driveway_reserve_retry(uuid, integer) from public, anon, authenticated;
grant execute on function public.driveway_start(uuid, uuid, text, text, text, integer, integer, text, integer, integer, integer) to service_role;
grant execute on function public.driveway_claim(uuid) to service_role;
grant execute on function public.driveway_reserve_retry(uuid, integer) to service_role;

-- Handy checks:
--   select * from driveway_days order by day desc limit 14;                         -- paid calls per day
--   select status, outcome, count(*) from driveway_jobs group by 1, 2 order by 1, 2; -- how jobs ended
