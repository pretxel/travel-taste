-- Enable required extensions
create extension if not exists pgcrypto;

-- =========================================================================
-- POSTS
-- =========================================================================
create table posts (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,
  caption      text,
  taken_at     timestamptz,
  created_at   timestamptz not null default now(),
  width        int,
  height       int,
  blurhash     text
);
create index posts_created_at_idx on posts (created_at desc);

-- =========================================================================
-- VIEWER CODES
-- =========================================================================
create table viewer_codes (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  code_hash     text not null unique,
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  last_used_at  timestamptz
);
create index viewer_codes_active_idx on viewer_codes (revoked_at)
  where revoked_at is null;

-- =========================================================================
-- VIEWER SESSIONS (audit log of redemptions)
-- =========================================================================
create table viewer_sessions (
  id           uuid primary key default gen_random_uuid(),
  code_id      uuid not null references viewer_codes(id) on delete cascade,
  redeemed_at  timestamptz not null default now(),
  ip_hash      text,
  user_agent   text
);
create index viewer_sessions_code_idx on viewer_sessions (code_id, redeemed_at desc);

-- =========================================================================
-- RATE LIMIT BUCKET (per-IP sliding window for redeem + admin login)
-- =========================================================================
create table rate_limit_attempts (
  id           bigserial primary key,
  bucket       text not null,
  ip_hash      text not null,
  attempted_at timestamptz not null default now()
);
create index rate_limit_lookup_idx
  on rate_limit_attempts (bucket, ip_hash, attempted_at desc);

create or replace function rate_limit_purge_old(older_than interval)
returns void
language sql
as $$
  delete from rate_limit_attempts
  where attempted_at < now() - older_than;
$$;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
alter table posts enable row level security;
alter table viewer_codes enable row level security;
alter table viewer_sessions enable row level security;
alter table rate_limit_attempts enable row level security;

create policy posts_viewer_read on posts
  for select to anon
  using (current_setting('request.jwt.claims', true)::jsonb ? 'viewer_code_id');

-- =========================================================================
-- STORAGE BUCKET (private)
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('posts', 'posts', false)
on conflict (id) do nothing;

create policy "posts_no_anon_read"
  on storage.objects for select to anon
  using (false);

create policy "posts_no_anon_write"
  on storage.objects for insert to anon
  with check (false);
