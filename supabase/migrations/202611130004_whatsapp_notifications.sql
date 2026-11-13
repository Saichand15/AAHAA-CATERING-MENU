alter table public.notification_settings
  add column whatsapp_enabled boolean not null default false,
  add column whatsapp_recipients text[] not null default '{}',
  add column whatsapp_consent_at timestamptz,
  add column whatsapp_consent_by uuid references auth.users(id);
alter table public.notification_jobs
  add column channel text not null default 'email' check (channel in ('email','whatsapp')),
  add column whatsapp_message jsonb,
  add column send_started_at timestamptz,
  add column send_token uuid,
  add column delivery_status text check (delivery_status in ('sent','delivered','read','failed')),
  add column delivery_updated_at timestamptz;
alter table public.notification_jobs drop constraint notification_jobs_request_id_recipient_audience_key;
alter table public.notification_jobs add unique(request_id,recipient,audience,channel);
create index jobs_provider_idx on public.notification_jobs(provider_id) where provider_id is not null;

create function public.queue_whatsapp_request() returns trigger
language plpgsql security definer set search_path = '' as $$
declare config public.notification_settings;
begin
  select * into config from public.notification_settings where id;
  if config.whatsapp_enabled then
    if config.whatsapp_consent_at is null or cardinality(config.whatsapp_recipients)=0 then
      raise exception 'WHATSAPP_RECIPIENTS_REQUIRED';
    end if;
    insert into public.notification_jobs(request_id,recipient,audience,channel)
    select new.id,phone,'staff','whatsapp' from unnest(config.whatsapp_recipients) phone
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger queue_whatsapp_after_request after insert on public.catering_requests
for each row execute function public.queue_whatsapp_request();

alter function public.save_business_settings(jsonb,text[]) rename to save_business_settings_base;
revoke execute on function public.save_business_settings_base(jsonb,text[]) from authenticated;
create function public.save_business_settings(
  p_settings jsonb,p_recipients text[],p_whatsapp_enabled boolean default false,
  p_whatsapp_recipients text[] default '{}',p_whatsapp_consent boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner() then raise exception 'OWNER_REQUIRED'; end if;
  if p_whatsapp_enabled and (not p_whatsapp_consent or coalesce(cardinality(p_whatsapp_recipients),0)=0) then
    raise exception 'WHATSAPP_CONSENT_REQUIRED';
  end if;
  if coalesce(cardinality(p_whatsapp_recipients),0)>10 or exists(
    select 1 from unnest(p_whatsapp_recipients) phone where phone !~ '^\+[1-9][0-9]{7,14}$'
  ) then raise exception 'INVALID_WHATSAPP_RECIPIENT'; end if;
  perform public.save_business_settings_base(p_settings,p_recipients);
  update public.notification_settings set
    whatsapp_enabled=p_whatsapp_enabled,whatsapp_recipients=p_whatsapp_recipients,
    whatsapp_consent_at=case when p_whatsapp_consent then now() else null end,
    whatsapp_consent_by=case when p_whatsapp_consent then auth.uid() else null end
  where id;
end $$;
revoke all on function public.save_business_settings(jsonb,text[],boolean,text[],boolean) from public,anon;
grant execute on function public.save_business_settings(jsonb,text[],boolean,text[],boolean) to authenticated;

create function public.record_whatsapp_status(
  p_id uuid,p_send_token uuid,p_provider_id text,p_status text,p_time timestamptz,p_error text
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('sent','delivered','read','failed') then raise exception 'INVALID_DELIVERY_STATUS'; end if;
  update public.notification_jobs set
    provider_id=p_provider_id,delivery_status=p_status,delivery_updated_at=p_time,
    status=case when p_status='failed' then 'failed' else 'sent' end,
    last_error=case when p_status='failed' then p_error else null end
  where id=p_id and channel='whatsapp' and send_token=p_send_token
    and (provider_id is null or provider_id=p_provider_id)
    and (delivery_updated_at is null or delivery_updated_at<=p_time)
    and (delivery_status is distinct from 'read' or p_status='read')
    and (delivery_status is distinct from 'delivered' or p_status in ('delivered','read'));
  return found;
end $$;
create function public.acknowledge_whatsapp_send(p_id uuid,p_lease_token uuid,p_provider_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.notification_jobs set
    status=case when delivery_status='failed' then 'failed' else 'sent' end,
    provider_id=p_provider_id,sent_at=now(),locked_until=null,lease_token=null,
    last_error=case when delivery_status='failed' then last_error else null end
  where id=p_id and channel='whatsapp' and lease_token=p_lease_token
    and (provider_id is null or provider_id=p_provider_id);
  return found;
end $$;
revoke all on function public.record_whatsapp_status(uuid,uuid,text,text,timestamptz,text) from public,anon,authenticated;
revoke all on function public.acknowledge_whatsapp_send(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.record_whatsapp_status(uuid,uuid,text,text,timestamptz,text) to service_role;
grant execute on function public.acknowledge_whatsapp_send(uuid,uuid,text) to service_role;
