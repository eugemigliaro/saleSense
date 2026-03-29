alter table public.leads
  add column if not exists chat_session_id uuid
    references public.chat_sessions(id) on delete set null,
  add column if not exists is_sale_confirmed boolean not null default false;

create index if not exists leads_chat_session_id_idx
  on public.leads (chat_session_id);

alter table public.conversation_analytics
  add column if not exists manual_sale_confirmed boolean not null default false;
