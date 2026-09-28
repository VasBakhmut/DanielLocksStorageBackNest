-- Prototype backend only. No anonymous browser access; service role stays in NestJS.
create table if not exists public.products (id text primary key, name text not null, finish text, image text, facts jsonb not null, source text);
create table if not exists public.knowledge_sources (id text primary key, title text not null, url text not null, models jsonb not null, text text not null);
create table if not exists public.sessions (id uuid primary key, payload jsonb not null, updated_at timestamptz not null default now());
alter table public.products enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.sessions enable row level security;
revoke all on public.products, public.knowledge_sources, public.sessions from anon, authenticated;
