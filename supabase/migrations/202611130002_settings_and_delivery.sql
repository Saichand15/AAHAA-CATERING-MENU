alter table public.notification_jobs add column message jsonb;

create function public.save_business_settings(p_settings jsonb, p_recipients text[])
returns void language plpgsql security definer set search_path = '' as $$
declare current_currency text; config public.business_settings;
begin
  if not public.is_owner() then raise exception 'OWNER_REQUIRED'; end if;
  if cardinality(p_recipients) not between 1 and 10 then raise exception 'RECIPIENTS_REQUIRED'; end if;
  select currency into current_currency from public.business_settings where id for update;
  config := jsonb_populate_record(null::public.business_settings,p_settings);
  if config.currency <> current_currency and exists(select 1 from public.menu_items) then
    raise exception 'CURRENCY_LOCKED';
  end if;
  update public.business_settings set name=config.name,tagline=config.tagline,phone=config.phone,email=config.email,
    whatsapp=config.whatsapp,address=config.address,service_area=config.service_area,currency=config.currency,timezone=config.timezone,
    lead_hours=config.lead_hours,min_guests=config.min_guests,max_guests=config.max_guests,delivery_enabled=config.delivery_enabled,
    pickup_enabled=config.pickup_enabled,hours=config.hours,privacy_notice=config.privacy_notice,accepting_requests=config.accepting_requests
  where id;
  update public.notification_settings set recipients=p_recipients where id;
end $$;
revoke all on function public.save_business_settings(jsonb,text[]) from public,anon;
grant execute on function public.save_business_settings(jsonb,text[]) to authenticated;

-- Keep settings and notification recipients on the transactional, owner-only path.
drop policy "Owner updates business" on public.business_settings;
drop policy "Owner updates recipients" on public.notification_settings;
