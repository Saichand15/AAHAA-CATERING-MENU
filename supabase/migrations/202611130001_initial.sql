-- Apply using Supabase migrations. No sample customers or menu data are inserted.
create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager')),
  created_at timestamptz not null default now()
);

create function public.is_staff() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.staff_members where user_id = auth.uid()); $$;
create function public.is_owner() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.staff_members where user_id = auth.uid() and role = 'owner'); $$;

create table public.business_settings (
  id boolean primary key default true check (id),
  name text not null default 'Aahaa Indian Kitchen',
  tagline text not null default 'Feel the taste',
  phone text not null default '',
  email text not null default '',
  whatsapp text not null default '',
  address text not null default '',
  service_area text not null default '',
  currency text not null default 'USD',
  timezone text not null default 'UTC',
  lead_hours integer not null default 48 check (lead_hours between 0 and 8760),
  min_guests integer not null default 10 check (min_guests > 0),
  max_guests integer not null default 500 check (max_guests >= min_guests),
  delivery_enabled boolean not null default false,
  pickup_enabled boolean not null default true,
  hours text not null default '',
  privacy_notice text not null default '',
  accepting_requests boolean not null default false
);
insert into public.business_settings(id) values (true);

create table public.notification_settings (
  id boolean primary key default true check (id),
  recipients text[] not null default '{}' check (cardinality(recipients) <= 10)
);
insert into public.notification_settings(id) values (true);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  description text not null default '',
  category text not null,
  kind text not null default 'item' check (kind in ('item','package')),
  price_minor bigint check (price_minor between 0 and 100000000),
  unit text not null default 'tray',
  minimum_quantity integer not null default 1 check (minimum_quantity between 1 and 10000),
  quantity_step integer not null default 1 check (quantity_step between 1 and 10000),
  dietary text[] not null default '{}',
  allergens text[] not null default '{}',
  image_url text,
  options jsonb not null default '[]' check (jsonb_typeof(options) = 'array'),
  available boolean not null default true,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index menu_public_idx on public.menu_items(published, sort_order, category);

create sequence public.catering_reference_seq;
create table public.catering_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  idempotency_key uuid not null unique,
  payload_hash text not null,
  created_at timestamptz not null default now(),
  customer_name text not null,
  email text not null,
  phone text not null,
  preferred_contact text not null check (preferred_contact in ('email','phone','whatsapp')),
  event_type text not null,
  event_date date not null,
  event_time time not null,
  timezone text not null,
  guests integer not null check (guests > 0),
  fulfillment text not null check (fulfillment in ('pickup','delivery')),
  address text not null default '',
  notes text not null default '',
  allergies text not null default '',
  whatsapp_consent boolean not null default false,
  privacy_notice text not null,
  privacy_accepted_at timestamptz not null,
  currency text not null,
  known_subtotal_minor bigint not null check (known_subtotal_minor >= 0),
  has_unpriced_items boolean not null,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  status text not null default 'new' check (status in ('new','contacted','closed')),
  version integer not null default 1
);
comment on column public.catering_requests.items is 'Immutable item and modifier snapshots, saved atomically with request and outbox.';
create index requests_created_idx on public.catering_requests(created_at desc);
create index requests_event_status_idx on public.catering_requests(event_date, status);

create table public.request_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.catering_requests(id),
  author_id uuid not null references auth.users(id),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index notes_request_idx on public.request_notes(request_id, created_at);
create table public.request_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.catering_requests(id),
  actor_id uuid not null references auth.users(id),
  status text not null,
  created_at timestamptz not null default now()
);
create index history_request_idx on public.request_history(request_id, created_at);

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.catering_requests(id),
  recipient text not null,
  audience text not null check (audience in ('staff','customer')),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  lease_token uuid,
  last_error text,
  provider_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(request_id, recipient, audience)
);
create index jobs_queue_idx on public.notification_jobs(status, next_attempt_at);
create table public.submission_rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);

create function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare hit_count integer;
begin
  delete from public.submission_rate_limits where reset_at < now() - interval '1 day';
  insert into public.submission_rate_limits as limits(key,count,reset_at)
  values(p_key,1,now() + make_interval(secs => p_window_seconds))
  on conflict(key) do update set
    count = case when limits.reset_at <= now() then 1 else limits.count + 1 end,
    reset_at = case when limits.reset_at <= now() then now() + make_interval(secs => p_window_seconds) else limits.reset_at end
  returning count into hit_count;
  return hit_count <= p_limit;
end $$;

create function public.submit_catering_request(p_key uuid, p_hash text, p_payload jsonb)
returns table(reference text, id uuid, duplicate boolean)
language plpgsql security definer set search_path = '' as $$
declare existing public.catering_requests; new_request public.catering_requests; recipients text[]; ref text; serial text;
begin
  -- Serializes retries for this submission without blocking unrelated customers.
  perform pg_advisory_xact_lock(hashtextextended(p_key::text, 0));
  select * into existing from public.catering_requests r where r.idempotency_key = p_key;
  if found then
    if existing.payload_hash <> p_hash then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return query select existing.reference, existing.id, true;
    return;
  end if;
  if not exists(select 1 from public.business_settings where accepting_requests) then
    raise exception 'REQUESTS_PAUSED';
  end if;
  select n.recipients into recipients from public.notification_settings n where n.id;
  if coalesce(cardinality(recipients),0) = 0 then raise exception 'NOTIFICATION_RECIPIENTS_REQUIRED'; end if;
  serial := nextval('public.catering_reference_seq')::text;
  ref := 'CAT-' || to_char(now(), 'YYYY') || '-' || lpad(serial, greatest(6,length(serial)), '0');
  insert into public.catering_requests (
    reference,idempotency_key,payload_hash,customer_name,email,phone,preferred_contact,
    event_type,event_date,event_time,timezone,guests,fulfillment,address,notes,allergies,
    whatsapp_consent,privacy_notice,privacy_accepted_at,currency,known_subtotal_minor,has_unpriced_items,items
  ) values (
    ref,p_key,p_hash,p_payload->>'customer_name',p_payload->>'email',p_payload->>'phone',p_payload->>'preferred_contact',
    p_payload->>'event_type',(p_payload->>'event_date')::date,(p_payload->>'event_time')::time,p_payload->>'timezone',
    (p_payload->>'guests')::integer,p_payload->>'fulfillment',p_payload->>'address',p_payload->>'notes',p_payload->>'allergies',
    (p_payload->>'whatsapp_consent')::boolean,p_payload->>'privacy_notice',(p_payload->>'privacy_accepted_at')::timestamptz,
    p_payload->>'currency',(p_payload->>'known_subtotal_minor')::bigint,(p_payload->>'has_unpriced_items')::boolean,p_payload->'items'
  ) returning * into new_request;
  insert into public.notification_jobs(request_id,recipient,audience)
  select new_request.id, lower(trim(email)), 'staff' from unnest(recipients) email
  on conflict do nothing;
  insert into public.notification_jobs(request_id,recipient,audience)
  values (new_request.id,new_request.email,'customer');
  return query select new_request.reference,new_request.id,false;
end $$;

create function public.claim_notifications()
returns setof public.notification_jobs
language sql security definer set search_path = '' as $$
  update public.notification_jobs set status = 'processing', attempts = attempts + 1,
    locked_until = now() + interval '5 minutes', lease_token = gen_random_uuid()
  where id in (
    select id from public.notification_jobs
    where ((status = 'pending' and next_attempt_at <= now()) or
           (status = 'processing' and locked_until <= now()))
      and attempts < 5
    order by next_attempt_at
    for update skip locked limit 10
  ) returning *;
$$;

create function public.change_request_status(p_id uuid, p_version integer, p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'STAFF_REQUIRED'; end if;
  if p_status not in ('new','contacted','closed') then raise exception 'INVALID_STATUS'; end if;
  update public.catering_requests set status = p_status, version = version + 1
    where id = p_id and version = p_version;
  if not found then return false; end if;
  insert into public.request_history(request_id,actor_id,status) values(p_id,auth.uid(),p_status);
  return true;
end $$;

alter table public.business_settings enable row level security;
alter table public.staff_members enable row level security;
alter table public.notification_settings enable row level security;
alter table public.menu_items enable row level security;
alter table public.catering_requests enable row level security;
alter table public.request_notes enable row level security;
alter table public.request_history enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.submission_rate_limits enable row level security;

create policy "Public business information" on public.business_settings for select to anon, authenticated using (true);
create policy "Owner updates business" on public.business_settings for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Own membership" on public.staff_members for select to authenticated using (user_id = auth.uid());
create policy "Staff reads recipients" on public.notification_settings for select to authenticated using (public.is_staff());
create policy "Owner updates recipients" on public.notification_settings for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Published menus or staff" on public.menu_items for select to anon, authenticated using (published or public.is_staff());
create policy "Staff inserts menus" on public.menu_items for insert to authenticated with check (public.is_staff());
create policy "Staff updates menus" on public.menu_items for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff reads requests" on public.catering_requests for select to authenticated using (public.is_staff());
create policy "Staff reads notes" on public.request_notes for select to authenticated using (public.is_staff());
create policy "Staff adds notes" on public.request_notes for insert to authenticated with check (public.is_staff() and author_id = auth.uid());
create policy "Staff reads history" on public.request_history for select to authenticated using (public.is_staff());
create policy "Staff reads jobs" on public.notification_jobs for select to authenticated using (public.is_staff());

revoke all on function public.submit_catering_request(uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.consume_rate_limit(text,integer,integer) from public, anon, authenticated;
revoke all on function public.claim_notifications() from public, anon, authenticated;
revoke all on function public.change_request_status(uuid,integer,text) from public, anon;
grant execute on function public.submit_catering_request(uuid,text,jsonb) to service_role;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;
grant execute on function public.claim_notifications() to service_role;
grant execute on function public.change_request_status(uuid,integer,text) to authenticated;
grant select on public.business_settings, public.menu_items to anon, authenticated;
grant select on public.staff_members,public.notification_settings,public.catering_requests,public.request_notes,public.request_history,public.notification_jobs to authenticated;
grant update on public.business_settings,public.notification_settings,public.menu_items to authenticated;
grant insert on public.menu_items,public.request_notes to authenticated;
grant all on all tables in schema public to service_role;
grant usage,select on sequence public.catering_reference_seq to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('menu-images','menu-images',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy "Public menu images" on storage.objects for select using (bucket_id = 'menu-images');
create policy "Staff uploads menu images" on storage.objects for insert to authenticated
with check (bucket_id = 'menu-images' and public.is_staff());
