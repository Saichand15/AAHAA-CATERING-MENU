create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  access_hash text not null unique check (access_hash ~ '^[a-f0-9]{64}$'),
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null check (length(customer_name) between 2 and 120),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  status text not null default 'open' check (status in ('open','closed')),
  privacy_notice text not null check (length(privacy_notice) >= 50),
  privacy_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_body text not null default '',
  last_message_id bigint not null default 0,
  last_customer_id bigint not null default 0,
  last_staff_id bigint not null default 0,
  customer_read_id bigint not null default 0,
  staff_read_id bigint not null default 0
);
create index chat_inbox_idx on public.chat_conversations(updated_at desc);
create index chat_customer_idx on public.chat_conversations(customer_id,updated_at desc) where customer_id is not null;
create table public.chat_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  client_id uuid not null,
  sender text not null check (sender in ('customer','staff')),
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique(conversation_id,client_id)
);
create index chat_messages_thread_idx on public.chat_messages(conversation_id,id desc);
create table public.chat_request_links (
  request_id uuid primary key references public.catering_requests(id) on delete cascade,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index chat_links_thread_idx on public.chat_request_links(conversation_id);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_request_links enable row level security;
revoke all on public.chat_conversations,public.chat_messages,public.chat_request_links from anon,authenticated;
grant all on public.chat_conversations,public.chat_messages,public.chat_request_links to service_role;
grant usage,select on sequence public.chat_messages_id_seq to service_role;

-- All chat access is server-authorized. Neither guest tokens nor enquiry numbers grant direct database access.
create function public.send_chat_message(p_id uuid,p_client_id uuid,p_sender text,p_author_id uuid,p_body text)
returns public.chat_messages language plpgsql security definer set search_path = '' as $$
declare saved public.chat_messages;
begin
  perform 1 from public.chat_conversations where id=p_id for update;
  if not found then raise exception 'CHAT_NOT_FOUND'; end if;
  insert into public.chat_messages(conversation_id,client_id,sender,author_id,body)
  values(p_id,p_client_id,p_sender,p_author_id,trim(p_body))
  on conflict(conversation_id,client_id) do nothing returning * into saved;
  if not found then
    select * into saved from public.chat_messages where conversation_id=p_id and client_id=p_client_id;
    if saved.sender<>p_sender or saved.author_id is distinct from p_author_id or saved.body<>trim(p_body) then
      raise exception 'CHAT_MESSAGE_CONFLICT';
    end if;
    return saved;
  end if;
  update public.chat_conversations set
    updated_at=now(),last_body=left(saved.body,160),last_message_id=saved.id,status='open',
    last_customer_id=case when p_sender='customer' then saved.id else last_customer_id end,
    last_staff_id=case when p_sender='staff' then saved.id else last_staff_id end
  where id=p_id;
  return saved;
end $$;

create function public.start_customer_chat(p_access_hash text,p_customer_id uuid,p_name text,p_phone text,p_privacy text,p_client_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare thread public.chat_conversations;
begin
  insert into public.chat_conversations(access_hash,customer_id,customer_name,phone,privacy_notice)
  values(p_access_hash,p_customer_id,p_name,p_phone,p_privacy)
  on conflict(access_hash) do nothing returning * into thread;
  if not found then
    select * into thread from public.chat_conversations where access_hash=p_access_hash;
    if thread.customer_id is distinct from p_customer_id or thread.customer_name<>p_name or thread.phone<>p_phone then
      raise exception 'CHAT_MESSAGE_CONFLICT';
    end if;
  end if;
  perform public.send_chat_message(thread.id,p_client_id,'customer',p_customer_id,p_body);
  return thread.id;
end $$;

create function public.mark_chat_read(p_id uuid,p_sender text,p_message_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_sender not in ('customer','staff') then raise exception 'INVALID_SENDER'; end if;
  update public.chat_conversations set
    customer_read_id=case when p_sender='customer' then greatest(customer_read_id,least(p_message_id,last_message_id)) else customer_read_id end,
    staff_read_id=case when p_sender='staff' then greatest(staff_read_id,least(p_message_id,last_message_id)) else staff_read_id end
  where id=p_id;
end $$;
revoke all on function public.send_chat_message(uuid,uuid,text,uuid,text),public.start_customer_chat(text,uuid,text,text,text,uuid,text),public.mark_chat_read(uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.send_chat_message(uuid,uuid,text,uuid,text),public.start_customer_chat(text,uuid,text,text,text,uuid,text),public.mark_chat_read(uuid,text,bigint) to service_role;

create function public.chat_unread_count() returns bigint language sql stable security definer set search_path = ''
as $$ select count(*) from public.chat_conversations where last_customer_id>staff_read_id; $$;
revoke all on function public.chat_unread_count() from public,anon,authenticated;
grant execute on function public.chat_unread_count() to service_role;
