-- =============================================================================
-- FixMyFashion Repair — Dashboard database schema
-- =============================================================================
--
-- Target: PostgreSQL 18 on Neon. Plain Postgres — no vendor extensions.
-- Idempotent: safe to re-run.
--
-- Apply with:  node --env-file=.env.local scripts/qa-runtime/apply-schema.mjs
-- or paste into the Neon console SQL editor.
--
-- WHY THIS FILE EXISTS
-- The schema previously existed only as prose in CLAUDE.md and as SQL typed by
-- hand into the Supabase web console. When that free-tier project locked out
-- after repeated dormancy (2026-10-31, I-R012), there was no way to recreate it
-- without auditing the application code column by column. That audit is baked
-- in here. This file is the source of truth; CLAUDE.md points at it.
--
-- It is also why the move off Supabase took minutes rather than days: the same
-- file applied unchanged to Neon. Keep it that way — if you change a column,
-- change it here first.
--
-- HOW IT WAS DERIVED
-- Every column below is one the application actually reads or writes. Verified
-- 2026-10-31 against all 7 Supabase call sites:
--   app/admin/page.tsx:47,54          app/api/auth/verify/route.ts:19,34,44,46
--   app/api/auth/send-link/route.ts:25,42   app/api/admin/impersonate/route.ts:35
--   app/api/admin/brand-checklist/route.ts:45   lib/launch-checklist.ts:24
--   scripts/qa-runtime/mint-magic-link.mjs:36,50
--
-- DELIBERATELY NOT INCLUDED (documented in older docs, zero hits in code):
--   table  admin_sessions                  -- admin auth runs via brand_sessions.role
--   column brand_sessions.magic_token      -- legacy, pre-dates the magic_links table
--   column brand_sessions.token_expires_at -- legacy, same
--   column brand_sessions.report_preference-- no code path writes it; no API route exists
--   column category_change_requests.resolved_at -- only `status` is ever read
-- Do not re-add these without a code path that uses them.
--
-- ACCESS MODEL
-- Neon exposes no public HTTP interface to the database — the only way in is a
-- connection string. The app connects as the owning role via `lib/db.ts`.
-- There is therefore NO Row Level Security here. The earlier Supabase version
-- of this file enabled RLS with no policies purely to neutralise Supabase's
-- auto-generated public PostgREST endpoint; with no such endpoint, RLS would
-- protect against nothing while risking locking us out. Do not add it back
-- unless a browser-side client is introduced.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- brand_sessions — one row per dashboard account (brands + admin)
-- -----------------------------------------------------------------------------
create table if not exists brand_sessions (
  id                      uuid primary key default gen_random_uuid(),

  -- identity
  brand_handle            text not null unique,   -- matches Shopify BrandConfig `subdomain`
                                                  -- UNIQUE because every lookup is
                                                  -- .eq('brand_handle', …).maybeSingle()
  brand_name              text not null,          -- display name; admin list sorts on this
  brand_email             text not null,          -- login address; looked up case-insensitively
  role                    text not null default 'brand'
                            check (role in ('brand', 'admin')),

  -- activity
  last_login_at           timestamptz,            -- stamped on each successful magic-link verify

  -- brand launch checklist (Sprint 5) — drives the amber Overview banner
  launch_footer_done      boolean not null default false,
  launch_email_done       boolean not null default false,
  launch_packaging_done   boolean not null default false,

  next_review_date        date,                   -- shown on Settings tab

  created_at              timestamptz not null default now()
);

-- Login does .ilike('brand_email', …) — case-insensitive. Keep it unique that way too.
create unique index if not exists brand_sessions_email_lower_idx
  on brand_sessions (lower(brand_email));


-- -----------------------------------------------------------------------------
-- magic_links — short-lived single-use login tokens (15 min TTL, set in app code)
-- -----------------------------------------------------------------------------
create table if not exists magic_links (
  id            uuid primary key default gen_random_uuid(),
  brand_handle  text not null references brand_sessions (brand_handle) on delete cascade,
  token         text not null unique,   -- UNIQUE supplies the lookup index
  expires_at    timestamptz not null,
  used          boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Supports the S7-M1 retention job below.
create index if not exists magic_links_created_at_idx on magic_links (created_at);


-- -----------------------------------------------------------------------------
-- login_attempts — every POST to /api/auth/send-link, matched or not (Brief 4 F1)
-- -----------------------------------------------------------------------------
-- magic_links only gets a row on a real brand match, so it can't rate-limit
-- unknown-email probing. This table logs every attempt so both the per-email
-- and per-IP counters in the send-link route see unmatched attempts too.
create table if not exists login_attempts (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  ip          text not null,
  created_at  timestamptz not null default now()
);

create index if not exists login_attempts_email_created_idx on login_attempts (email, created_at);
create index if not exists login_attempts_ip_created_idx on login_attempts (ip, created_at);


-- -----------------------------------------------------------------------------
-- category_change_requests — brand asks to change its allowed repair categories
-- -----------------------------------------------------------------------------
-- NOTE: as of 2026-10-31 NOTHING in the codebase inserts into this table. The
-- Settings tab offers a mailto: link instead, so the admin panel's "0 pending"
-- is structurally guaranteed rather than meaningful. Kept because the admin
-- panel reads it and would break without it. Either wire the insert or drop
-- both the table and the panel section — don't leave it half-built.
create table if not exists category_change_requests (
  id                    uuid primary key default gen_random_uuid(),
  brand_handle          text not null references brand_sessions (brand_handle) on delete cascade,
  requested_categories  text not null,
  status                text not null default 'pending'
                          check (status in ('pending', 'approved', 'rejected')),
  created_at            timestamptz not null default now()
);

create index if not exists category_change_requests_status_idx
  on category_change_requests (status);


-- =============================================================================
-- SEED — the live accounts
-- =============================================================================
-- Re-runnable: on conflict it refreshes the row rather than erroring.

insert into brand_sessions (brand_handle, brand_name, brand_email, role)
values ('admin', 'FixMyFashion Admin', 'geo.gklavas@gmail.com', 'admin')
on conflict (brand_handle) do update
  set brand_name  = excluded.brand_name,
      brand_email = excluded.brand_email,
      role        = excluded.role;

insert into brand_sessions (
  brand_handle, brand_name, brand_email, role,
  launch_footer_done, launch_email_done, launch_packaging_done, next_review_date
)
values (
  'becasual', 'Be Casual', 'info@be-casual.gr', 'brand',
  true,   -- footer link live on brand site
  true,   -- post-purchase email live
  false,  -- packaging insert still pending
  null    -- next quarterly review: set from the /admin panel when scheduled
          -- (previous value 2026-07-15 is in the past; left null deliberately)
)
on conflict (brand_handle) do update
  set brand_name            = excluded.brand_name,
      brand_email           = excluded.brand_email,
      role                  = excluded.role,
      launch_footer_done    = excluded.launch_footer_done,
      launch_email_done     = excluded.launch_email_done,
      launch_packaging_done = excluded.launch_packaging_done;

-- Kazi Line Fashion is NOT seeded — declined 2026-10-31, see I-R015.


-- =============================================================================
-- S7-M1 — data retention (GDPR)
-- =============================================================================
-- Delete spent/expired magic links older than 30 days. Magic links contain a
-- brand_handle and a token; they are not customer PII, but there is no reason
-- to keep them. Run from a scheduled job, or enable pg_cron below.

create or replace function purge_old_magic_links()
returns integer
language plpgsql
as $$
declare
  deleted integer;
begin
  delete from magic_links where created_at < now() - interval '30 days';
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

-- Optional, if pg_cron is available on the plan — weekly purge, Sundays 03:00 UTC:
--   create extension if not exists pg_cron;
--   select cron.schedule('purge-magic-links', '0 3 * * 0', 'select purge_old_magic_links()');
-- Otherwise call purge_old_magic_links() from the same scheduled job that keeps
-- the project awake (see I-R012 prevention note).


-- =============================================================================
-- Verification — run after applying, expect 2 rows and 3 tables
-- =============================================================================
-- select brand_handle, brand_name, role from brand_sessions order by role desc;
-- select table_name from information_schema.tables
--   where table_schema = 'public' order by table_name;
