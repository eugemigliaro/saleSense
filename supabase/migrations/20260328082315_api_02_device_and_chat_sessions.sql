create table if not exists public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  launched_by_manager_id uuid not null,
  state text not null default 'idle'
    check (state in ('idle', 'engaged', 'collecting-lead', 'completed')),
  started_at timestamptz not null default timezone('utc', now()),
  last_activity_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  device_session_id uuid not null
    references public.device_sessions(id) on delete cascade,
  store_id text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'completed')),
  started_at timestamptz not null default timezone('utc', now()),
  last_activity_at timestamptz not null default timezone('utc', now())
);

create index if not exists device_sessions_store_id_last_activity_at_idx
  on public.device_sessions (store_id, last_activity_at desc);

create index if not exists device_sessions_product_id_idx
  on public.device_sessions (product_id);

create index if not exists chat_sessions_store_id_last_activity_at_idx
  on public.chat_sessions (store_id, last_activity_at desc);

create index if not exists chat_sessions_device_session_id_idx
  on public.chat_sessions (device_session_id);
