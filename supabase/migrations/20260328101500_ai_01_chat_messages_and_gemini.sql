create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_session_id uuid not null
    references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('assistant', 'user')),
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_messages_chat_session_id_created_at_idx
  on public.chat_messages (chat_session_id, created_at asc);
