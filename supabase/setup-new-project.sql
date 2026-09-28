-- Setup for the current NestJS prototype. No tables or data are deleted.
begin;
-- Prototype backend only. No anonymous browser access; service role stays in NestJS.
create table if not exists public.products (id text primary key, name text not null, finish text, image text, facts jsonb not null, source text);
create table if not exists public.knowledge_sources (id text primary key, title text not null, url text not null, models jsonb not null, text text not null);
create table if not exists public.sessions (id uuid primary key, payload jsonb not null, updated_at timestamptz not null default now());
alter table public.products enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.sessions enable row level security;
revoke all on public.products, public.knowledge_sources, public.sessions from anon, authenticated;

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

-- Refresh the REST schema and return explicit verification rows.
notify pgrst, 'reload schema';
commit;
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in
('products','knowledge_sources','sessions','ingest_products','ingest_resources','ingest_chunks')
order by c.relname;
