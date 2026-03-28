create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  name text not null,
  brand text not null,
  category text not null,
  details_markdown text not null,
  comparison_snippet_markdown text not null,
  idle_media_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  ai_summary text,
  inferred_interest text,
  next_best_product text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists products_store_id_updated_at_idx
  on public.products (store_id, updated_at desc);

create index if not exists leads_store_id_created_at_idx
  on public.leads (store_id, created_at desc);

create index if not exists leads_product_id_idx
  on public.leads (product_id);

drop trigger if exists set_products_updated_at on public.products;

create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();
