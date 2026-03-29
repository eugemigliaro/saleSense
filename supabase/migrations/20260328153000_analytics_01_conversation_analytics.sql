create table if not exists public.conversation_analytics (
  chat_session_id uuid primary key
    references public.chat_sessions(id) on delete cascade,
  store_id text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  conversation_started_at timestamptz not null,
  conversation_ended_at timestamptz,
  conversation_duration_seconds integer
    check (
      conversation_duration_seconds is null
      or conversation_duration_seconds >= 0
    ),
  message_count integer not null default 0
    check (message_count >= 0),
  buy_probability numeric(5, 4)
    check (buy_probability is null or (buy_probability >= 0 and buy_probability <= 1)),
  sale_outcome text not null default 'none'
    check (sale_outcome in ('none', 'ai_inferred', 'store_confirmed')),
  feedback_sentiment text
    check (feedback_sentiment is null or feedback_sentiment in ('positive', 'neutral', 'negative')),
  feedback_score smallint
    check (feedback_score is null or (feedback_score >= 1 and feedback_score <= 5)),
  redirected_to_other_product boolean not null default false,
  redirect_target_product_id uuid
    references public.products(id) on delete set null,
  faq_topics text[] not null default '{}',
  faq_examples text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists conversation_analytics_store_id_started_at_idx
  on public.conversation_analytics (store_id, conversation_started_at desc);

create index if not exists conversation_analytics_product_id_idx
  on public.conversation_analytics (product_id);

create index if not exists conversation_analytics_redirect_target_product_id_idx
  on public.conversation_analytics (redirect_target_product_id);

drop trigger if exists set_conversation_analytics_updated_at
  on public.conversation_analytics;

create trigger set_conversation_analytics_updated_at
before update on public.conversation_analytics
for each row
execute function public.set_updated_at();
