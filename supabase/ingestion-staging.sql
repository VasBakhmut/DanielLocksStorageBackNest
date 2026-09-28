-- Separate staging area for collected, UNREVIEWED material.
-- Apply after schema.sql. Does not replace the prototype's live knowledge tables.
create table if not exists public.ingest_products (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.ingest_resources (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.ingest_chunks (
  id text primary key,
  payload jsonb not null,
  approved_for_answers boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.ingest_products enable row level security;
alter table public.ingest_resources enable row level security;
alter table public.ingest_chunks enable row level security;
revoke all on public.ingest_products, public.ingest_resources, public.ingest_chunks from anon, authenticated;
