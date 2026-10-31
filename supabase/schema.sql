-- =============================================================================
-- FixMyFashion Repair — Dashboard database schema
-- =============================================================================
--
-- Target: PostgreSQL (Supabase or any Postgres). Idempotent — safe to re-run.
--
-- WHY THIS FILE EXISTS
-- The schema previously existed only as prose in CLAUDE.md and as SQL typed by
-- hand into the Supabase web console. When the free-tier project locked out
-- after repeated dormancy (2026-10-31, I-R012), there was no way to recreate it
-- without auditing the application code column by column. That audit is now
-- baked in here. This file is the source of truth; CLAUDE.md documents it.
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
-- The app connects exclusively with the service-role key (lib/supabase.ts).
-- The anon key is never used. RLS is therefore enabled with NO policies: the
-- service role bypasses RLS, and anything else gets nothing. This is stricter
-- than the original setup and costs us nothing.
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


-- -----------------------------------------------------------------------------
-- Row Level Security — deny everything except the service role
-- -----------------------------------------------------------------------------
alter table brand_sessions            enable row level security;
alter table magic_links               enable row level security;
alter table category_change_requests  enable row level security;
-- Intentionally no policies. The service role bypasses RLS; every other key
-- gets zero rows. If a browser-side client is ever introduced, add policies
-- here first — do not disable RLS.


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
