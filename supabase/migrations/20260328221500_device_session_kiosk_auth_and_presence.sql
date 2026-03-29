alter table public.device_sessions
  add column if not exists label text,
  add column if not exists kiosk_token_hash text,
  add column if not exists claimed_at timestamptz,
  add column if not exists last_presence_at timestamptz,
  add column if not exists dismissed_at timestamptz;

create index if not exists device_sessions_store_id_dismissed_at_idx
  on public.device_sessions (store_id, dismissed_at, last_presence_at desc);

create index if not exists device_sessions_product_id_dismissed_at_idx
  on public.device_sessions (product_id, dismissed_at, last_presence_at desc);
