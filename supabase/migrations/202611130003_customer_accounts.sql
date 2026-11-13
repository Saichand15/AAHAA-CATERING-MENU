create table public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (length(full_name) <= 120),
  phone text not null default '' check (length(phone) <= 16),
  updated_at timestamptz not null default now()
);
alter table public.customer_profiles enable row level security;
alter table public.catering_requests add column customer_id uuid references auth.users(id) on delete set null;
create index requests_customer_idx on public.catering_requests(customer_id, created_at desc);

create function public.is_verified_customer() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null);
$$;
create policy "Customer reads own profile" on public.customer_profiles for select to authenticated
using (id=auth.uid() and public.is_verified_customer());
create policy "Customer inserts own profile" on public.customer_profiles for insert to authenticated
with check (id=auth.uid() and public.is_verified_customer());
create policy "Customer updates own profile" on public.customer_profiles for update to authenticated
using (id=auth.uid() and public.is_verified_customer())
with check (id=auth.uid() and public.is_verified_customer());
create policy "Customer reads own enquiries" on public.catering_requests for select to authenticated
using (customer_id=auth.uid() and public.is_verified_customer());
grant select,insert,update on public.customer_profiles to authenticated;
grant all on public.customer_profiles to service_role;

create function public.customer_accounts_ready() returns boolean
language sql immutable set search_path = '' as $$ select true; $$;
grant execute on function public.customer_accounts_ready() to anon,authenticated;

-- Retain the atomic request/outbox implementation and add verified ownership in the same transaction.
alter function public.submit_catering_request(uuid,text,jsonb) rename to submit_catering_request_base;
create function public.submit_catering_request(p_key uuid,p_hash text,p_payload jsonb,p_customer_id uuid default null)
returns table(reference text,id uuid,duplicate boolean)
language plpgsql security definer set search_path = '' as $$
declare result record; existing_customer uuid;
begin
  if p_customer_id is not null and not exists (
    select 1 from auth.users u where u.id=p_customer_id and u.email_confirmed_at is not null
      and lower(u.email)=lower(p_payload->>'email')
  ) then raise exception 'VERIFIED_CUSTOMER_REQUIRED'; end if;
  select * into result from public.submit_catering_request_base(p_key,p_hash,p_payload);
  select r.customer_id into existing_customer from public.catering_requests r where r.id=result.id;
  if result.duplicate and existing_customer is distinct from p_customer_id then
    raise exception 'ACCOUNT_CONFLICT';
  end if;
  if not result.duplicate and p_customer_id is not null then
    update public.catering_requests set customer_id=p_customer_id where catering_requests.id=result.id;
    insert into public.customer_profiles(id,full_name,phone)
    values(p_customer_id,p_payload->>'customer_name',p_payload->>'phone')
    on conflict on constraint customer_profiles_pkey do update set
      full_name=excluded.full_name,phone=excluded.phone,updated_at=now();
  end if;
  return query select result.reference::text,result.id::uuid,result.duplicate::boolean;
end $$;
revoke all on function public.submit_catering_request(uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.submit_catering_request(uuid,text,jsonb,uuid) to service_role;
