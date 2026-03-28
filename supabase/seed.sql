insert into public.products (
  id,
  store_id,
  name,
  brand,
  category,
  details_markdown,
  comparison_snippet_markdown,
  idle_media_url
)
values (
  '9d2f8f92-9e4f-4df5-8df1-5b1c3d0d0001',
  'preview-store',
  'Pixel 9 Pro',
  'Google',
  'Smartphone',
  $markdown$
# Google Pixel 9 Pro

Google's premium phone for customers who want a polished camera-first Android experience with Gemini built in.

- 6.8-inch Super Actua display with sharp brightness and smooth scrolling
- Triple rear camera system with strong low-light photography and zoom flexibility
- Gemini-powered assistance and clean Google software experience
- Premium design with all-day battery confidence for in-store demos
$markdown$,
  'Camera-first Android flagship with Gemini, premium display, polished software, and strong low-light photography.',
  'https://dummyimage.com/1200x1600/0f172a/60a5fa.png'
)
on conflict (id) do update
set
  store_id = excluded.store_id,
  name = excluded.name,
  brand = excluded.brand,
  category = excluded.category,
  details_markdown = excluded.details_markdown,
  comparison_snippet_markdown = excluded.comparison_snippet_markdown,
  idle_media_url = excluded.idle_media_url;

insert into public.device_sessions (
  id,
  store_id,
  product_id,
  launched_by_manager_id,
  state
)
values (
  '9d2f8f92-9e4f-4df5-8df1-5b1c3d0d0002',
  'preview-store',
  '9d2f8f92-9e4f-4df5-8df1-5b1c3d0d0001',
  '9d2f8f92-9e4f-4df5-8df1-5b1c3d0d0003',
  'idle'
)
on conflict (id) do update
set
  store_id = excluded.store_id,
  product_id = excluded.product_id,
  launched_by_manager_id = excluded.launched_by_manager_id,
  state = excluded.state,
  last_activity_at = timezone('utc', now());
