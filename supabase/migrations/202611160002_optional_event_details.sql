-- Contact-first enquiries preserve unknown information as NULL, never invented dates or guest counts.
alter table public.catering_requests
  alter column email drop not null,
  alter column event_type drop not null,
  alter column event_date drop not null,
  alter column event_time drop not null,
  alter column guests drop not null,
  alter column fulfillment drop not null;

-- Keep the existing verified-customer wrapper and transaction/ownership protections.
create or replace function public.submit_catering_request_base(p_key uuid, p_hash text, p_payload jsonb)
returns table(reference text, id uuid, duplicate boolean)
language plpgsql security definer set search_path = '' as $$
declare existing public.catering_requests; new_request public.catering_requests; recipients text[]; ref text; serial text;
begin
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
    ref,p_key,p_hash,p_payload->>'customer_name',nullif(p_payload->>'email',''),p_payload->>'phone',p_payload->>'preferred_contact',
    nullif(p_payload->>'event_type',''),nullif(p_payload->>'event_date','')::date,nullif(p_payload->>'event_time','')::time,p_payload->>'timezone',
    nullif(p_payload->>'guests','')::integer,nullif(p_payload->>'fulfillment',''),p_payload->>'address',p_payload->>'notes',p_payload->>'allergies',
    (p_payload->>'whatsapp_consent')::boolean,p_payload->>'privacy_notice',(p_payload->>'privacy_accepted_at')::timestamptz,
    p_payload->>'currency',(p_payload->>'known_subtotal_minor')::bigint,(p_payload->>'has_unpriced_items')::boolean,p_payload->'items'
  ) returning * into new_request;
  insert into public.notification_jobs(request_id,recipient,audience)
  select new_request.id, lower(trim(email)), 'staff' from unnest(recipients) email
  on conflict do nothing;
  if new_request.email is not null then
    insert into public.notification_jobs(request_id,recipient,audience)
    values (new_request.id,new_request.email,'customer');
  end if;
  return query select new_request.reference,new_request.id,false;
end $$;
