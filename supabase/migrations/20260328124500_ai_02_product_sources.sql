alter table public.products
add column if not exists source_urls text[] not null default '{}';
