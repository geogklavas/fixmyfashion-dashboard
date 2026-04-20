# FixMyFashion — Claude Code Project Context

Read this file at the start of every session before writing any code.
This is the single source of truth for the project architecture, decisions, and conventions.

---

## What This Project Is

FixMyFashion (fixmyfashion.gr) is a B2B clothing repair infrastructure platform.
Fashion brands offer their customers a white-label repair service. FixMyFashion handles
everything: logistics, craftspeople, quality control, customer communication.

We are building a **Brand Admin Dashboard** — a login-protected web app where each brand
partner monitors their repair service performance. This is separate from the Shopify store.

---

## What Already Exists (Do Not Break)

### The Shopify Store (single store, already live)
- One Shopify store for all brands and D2C
- URL: fixmyfashion.gr
- All repair orders flow through this one store
- Platform: Shopify + Klaviyo + Judge.me + Globo Forms + GTM/GA4

### Brand Portal Architecture (already working)
- Each brand gets a subdomain: [brand].fixmyfashion.gr
- DNS: CNAME at Papaki → shops.myshopify.com
- Shopify: subdomain added as custom domain
- One Liquid template handles ALL brands: `brand-landing-page` template
- Brand identity (logo, colors, categories, discount) stored in **BrandConfig metaobject**
- Subdomain is detected in `theme.liquid` → sets `brand_source` cart attribute automatically
- Quote flow (Globo form): hidden UTM field captures `utm_source=[brandhandle]`
- "REPAIRS BY FIXMYFASHION" tagline renders below brand logo on all brand portals
- Legal footer with policy links live on all brand portals

### Live brand portal
- be-casual.fixmyfashion.gr → live since April 15, 2026
- Discount code: BECASUAL50 (50% off, pilot)

### BrandConfig Metaobject — fields per brand entry
```
brand_handle        String    "becasual" (used for tag filtering)
brand_name          String    "be-casual"
brand_logo          File      (Shopify file URL)
primary_color       String    hex color e.g. "#1a1a1a"
portal_url          String    "be-casual.fixmyfashion.gr"
allowed_categories  String    "pants, jackets, shirts" (comma-separated)
discount_code       String    "BECASUAL50" (optional — empty = no banner)
```

### Order Tags — exact names (all 9, already in Shopify)
```
repair-quote-sent       → Quote form submitted, waiting for FMF review
repair-confirmed        → Payment received, confirmed
repair-received         → Garment physically received by craftsperson
repair-in-progress      → Repair underway
repair-completed        → Repair done, QA passed
repair-dispatched       → Return courier booked
repair-delivered        → Delivered to customer
repair-cod              → Cash on delivery order
repair-b2b-[handle]     → Brand identifier e.g. repair-b2b-becasual
```

### Klaviyo Email Flows (already built)
- Email #1: Quote received (trigger: Globo form submit) — IN PROGRESS
- Email #2: Quote ready / offer (trigger: tag repair-quote-sent) — NOT BUILT YET
- Email #3: Payment confirmed (trigger: payment + repair-confirmed) — LIVE ✅
- Email #4: Received + started (trigger: tag repair-received) — NOT BUILT YET
- Email #5: Dispatched (trigger: order fulfilled) — LIVE ✅
- Review request: 7 days after repair-delivered — LIVE ✅

### Analytics
- GA4 + GTM installed
- generate_lead event fires on Globo quote form submission
- Baseline conversion: 38.5% (42 leads / 109 form starts)
- Microsoft Clarity: installed, project setup pending

---

## What We Are Building — The Brand Admin Dashboard

### Overview
- Standalone Next.js web app hosted on Vercel
- URL: dashboard.fixmyfashion.gr
- Login-protected: each brand sees only their own data
- Data source: Shopify Admin GraphQL API (real-time, no caching in Stage 1)
- Auth: magic link email (via Resend)
- Brand config: read from Shopify BrandConfig metaobject

### Tech Stack — Dashboard
```
Framework:      Next.js 14 (App Router)
Hosting:        Vercel (free tier)
Auth:           Resend (magic link emails) + JWT in HttpOnly cookie
Database:       Supabase (free tier) — for auth/session state only in Stage 1
Data:           Shopify Admin GraphQL API
Styling:        Tailwind CSS
Charts:         Recharts
Language:       TypeScript
Version control: GitHub
```

### Key Architecture Decisions (final, do not revisit)
1. Real-time data: Shopify API queried on every page load — no caching in Stage 1
2. Per-brand isolation: JWT contains brandHandle, all Shopify queries server-side filter by tag repair-b2b-[brandHandle]
3. No brand tier/pricing shown anywhere in the dashboard UI
4. Category changes in Settings require FixMyFashion approval — show "pending" state after save, do not call Shopify API to update immediately
5. Sustainability benchmarks: generic only, no external citations (3kg CO2, 2700L water per repair)
6. Superadmin view: separate login route /admin — single view across all brands. Build after core dashboard.
7. Stage 2 (future): Supabase will mirror Shopify orders via webhooks. Dashboard will query Supabase instead of Shopify. No UI changes required — only data layer swap.

---

## Data Model — How Dashboard Gets Its Data

### Brand identity (for dashboard header, theming)
Source: Shopify Admin API — BrandConfig metaobject filtered by brand_handle

### Repair orders (for all tabs)
Source: Shopify Admin API — orders filtered by tag: repair-b2b-[brandHandle]

### Key order fields we use
```
id                  → order ID (display as #FMF-{number})
name                → Shopify order name
created_at          → order date
tags                → array — used for status detection
line_items          → repair type (from product title)
fulfillments        → fulfilled_at timestamp (for turnaround calc)
financial_status    → paid / pending (COD detection via repair-cod tag)
```

### Status detection from tags
```javascript
// Priority order — check most advanced stage first
if tags.includes('repair-delivered')   → status = 'Delivered'
if tags.includes('repair-dispatched')  → status = 'Dispatched'
if tags.includes('repair-completed')   → status = 'QA complete'
if tags.includes('repair-in-progress') → status = 'In progress'
if tags.includes('repair-received')    → status = 'Received'
if tags.includes('repair-confirmed')   → status = 'Confirmed'
if tags.includes('repair-quote-sent')  → status = 'Quote sent'
```

### Turnaround time calculation
```javascript
// Days from repair-received to repair-delivered
// Use order tag change timestamps if available, else use created_at → fulfillment.fulfilled_at
```

### Sustainability calculations
```javascript
const CO2_PER_REPAIR = 3       // kg
const WATER_PER_REPAIR = 2700  // litres
co2Saved = completedRepairs * CO2_PER_REPAIR
waterSaved = completedRepairs * WATER_PER_REPAIR
garmentsSaved = completedRepairs
```

### Review score
Source: Judge.me API (public widget API) — filtered by brand tag

---

## Dashboard — 7 Tabs

### Tab 1: Overview
- 4 KPI cards: repairs this month, all-time repairs, avg customer rating, avg turnaround
- Pipeline: count of orders at each tag stage (received, in-progress, QA complete, dispatched)
- Line chart: monthly repair volume (last 6 months)
- Line chart: customer satisfaction over time

### Tab 2: Sustainability
- 4 impact numbers: CO2 saved (kg), garments repaired, water saved (L), re-repair rate (%)
- Bar chart: cumulative CO2 saved by month
- Badge section: downloadable sustainability badge (PNG + SVG)

### Tab 3: Repair Log
- Filterable table: all repairs for this brand
- Columns: Order ID, Date (relative), Garment type indicator, Repair type, Status chip, Price, Review score
- Filters: status, repair type, month
- Pagination: 20 per page
- Footer: "Customer IDs anonymised per GDPR"

### Tab 4: Analytics
- Donut chart: repair type breakdown (zip, hem, seam, button, other)
- Bar chart: turnaround time distribution (days)
- Stacked bar chart: monthly volume by repair type
- Product Insights section: top garment × repair type combinations with bar indicators
  (e.g. "Jeans — Zip failure — 97 repairs — 28% of total")

### Tab 5: Map
- SVG map of Greece with anonymised repair location pins
- Pin size = repair volume (Athens will be dominant)
- Regional breakdown: % Attica, % Central Macedonia, % Rest of Greece
- Pickup method chart: ELTA vs BoxNow over time

### Tab 6: Reports
- Download cards: Monthly PDF, CSV export, Sustainability certificate, YTD summary
- Scheduled delivery toggle: monthly report by email on 1st of month

### Tab 7: Settings
- Portal URL (read-only display)
- QR code download (generated from portal URL)
- Allowed repair categories (toggle chips) + "Request update" button → shows pending state
- Account manager contact (Giorgos Gklavas, hello@fixmyfashion.gr)
- Next quarterly review date
- NO tier or pricing information shown anywhere

---

## Project Structure — How to Organise the Code

```
/app
  /dashboard          → protected layout (checks auth)
    /page.tsx          → redirects to /dashboard/overview
    /overview/page.tsx
    /sustainability/page.tsx
    /log/page.tsx
    /analytics/page.tsx
    /map/page.tsx
    /reports/page.tsx
    /settings/page.tsx
  /login/page.tsx      → magic link request form
  /auth/verify/page.tsx → magic link token verification
  /admin/page.tsx      → superadmin view (all brands) — build last
/api
  /auth/send-link/route.ts   → Resend magic link
  /auth/verify/route.ts      → verify token, set cookie
  /auth/logout/route.ts
  /brand/config/route.ts     → fetch BrandConfig metaobject
  /repairs/route.ts          → fetch orders by brand tag (main data endpoint)
  /repairs/stats/route.ts    → aggregated stats (counts, averages)
/components
  /dashboard/          → tab components
  /charts/             → Recharts wrappers
  /ui/                 → reusable UI (cards, chips, badges)
/lib
  /shopify.ts          → Shopify Admin GraphQL client
  /auth.ts             → JWT helpers
  /sustainability.ts   → CO2/water calculations
  /supabase.ts         → Supabase client (auth sessions)
```

---

## Environment Variables Needed

```bash
# Shopify
SHOPIFY_STORE_DOMAIN=fixmyfashion.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...

# Auth
JWT_SECRET=...
RESEND_API_KEY=re_...
DASHBOARD_URL=https://dashboard.fixmyfashion.gr

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Supabase Schema (for auth only in Stage 1)

```sql
-- Brand sessions / auth
CREATE TABLE brand_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_handle text NOT NULL,
  brand_name text NOT NULL,
  brand_email text NOT NULL,
  magic_token text,
  token_expires_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Magic link tokens (short-lived)
CREATE TABLE magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_handle text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

---

## Shopify GraphQL — Key Queries

### Fetch orders by brand tag
```graphql
query GetBrandRepairs($brandHandle: String!, $cursor: String) {
  orders(
    first: 50
    after: $cursor
    query: "tag:repair-b2b-$brandHandle"
    sortKey: CREATED_AT
    reverse: true
  ) {
    edges {
      node {
        id
        name
        createdAt
        tags
        financialStatus
        lineItems(first: 5) {
          edges {
            node {
              title
              price {
                amount
              }
            }
          }
        }
        fulfillments {
          createdAt
          status
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
    }
  }
}
```

### Fetch BrandConfig metaobject
```graphql
query GetBrandConfig($brandHandle: String!) {
  metaobjects(type: "brand_config", first: 50) {
    edges {
      node {
        fields {
          key
          value
        }
      }
    }
  }
}
```

---

## Coding Conventions

- TypeScript everywhere — no plain JS files
- All Shopify API calls server-side only — never in client components
- JWT is HttpOnly cookie — never expose to browser JS
- Every API route checks auth before doing anything else
- Tailwind for all styling — no CSS modules, no inline styles
- Recharts for all charts
- Loading states on every data-fetching component
- Error boundaries on every tab
- All monetary values in EUR (€)
- Dates: format as relative ("3d ago") in tables, full date in exports

---

## What NOT To Do

- Do not modify the Shopify theme files — the portal works, leave it alone
- Do not create new Shopify products or collections
- Do not send emails from the dashboard — Klaviyo handles all customer emails
- Do not store repair order data in Supabase in Stage 1 — Shopify is the only source
- Do not expose the Shopify Admin token in any client-side code
- Do not show brand tier or monthly fee anywhere in the brand-facing UI
- Do not call Shopify to update allowed_categories — just show "pending approval" state

---

## Session Checklist

At the start of every Claude Code session:
1. Read this file (CLAUDE.md)
2. Read SPEC.md for the specific feature being built
3. Check which files exist already before creating new ones
4. Run `npm run dev` and confirm the app starts before making changes
5. After each working feature, commit with a descriptive message

At the end of every session:
1. Ensure `npm run build` passes with no errors
2. Commit everything that is working
3. Note any incomplete work at the bottom of this file under "Session Notes"

---

## Session Notes

### 2026-04-20 → 2026-04-21 — Initial build + deploy (Session 1)

**Repo:** https://github.com/geogklavas/fixmyfashion-dashboard
**Live:** https://dashboard.fixmyfashion.gr
**Working dir:** `c:\Users\George Gklavas\Desktop\FMF ADMIN\fixmyfashion-dashboard`

**Shipped:**
- Next.js 16 (app router) + TS + Tailwind scaffold
- Magic-link auth (Resend + JWT via jose, 30d HttpOnly cookie)
- Supabase: `brand_sessions`, `magic_links`, `category_change_requests` tables (RLS on, service-role key bypasses)
- `role` column on `brand_sessions` — `brand` or `admin` (admin redirected to `/admin` after login)
- Shopify Admin GraphQL client + mock-data fallback when token missing (`lib/data.ts` + `lib/mock.ts`)
- All 7 brand tabs: Overview, Sustainability, Repair Log, Analytics, Map, Reports, Settings
- Superadmin `/admin` — all-brands table + pending category change requests queue
- Shopify OAuth install flow at `/api/shopify/install` → `/api/shopify/callback` (admin-gated, CSRF + HMAC validated, shows token for copy-paste into Vercel)
- Custom domain `dashboard.fixmyfashion.gr` on Vercel via Papaki CNAME
- Resend domain verified for `fixmyfashion.gr` (custom return-path `updates` subdomain to avoid Klaviyo NS conflict on `send`)
- Jobs: PDF + CSV exports (jsPDF), QR code generator (qrcode), sustainability badge (SVG + canvas PNG)
- `proxy.ts` (renamed from middleware.ts for Next.js 16) protects `/dashboard/*` and `/admin/*`

**Live accounts in Supabase:**
- `geo.gklavas@gmail.com` → role=`admin`, handle=`admin`
- `info@be-casual.gr` → role=`brand`, handle=`becasual`

**Key env vars in Vercel (all set):**
- `SHOPIFY_STORE_DOMAIN=4xps3i-gg.myshopify.com` (Shopify's internal handle — user can request rename from Shopify Support)
- `SHOPIFY_ADMIN_ACCESS_TOKEN` — live `shpat_...` from OAuth install (value lives in Vercel only; never commit)
- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET` — needed for future OAuth re-installs only (values in Vercel only; never commit)
- `JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL=FixMyFashion <dashboard@fixmyfashion.gr>`
- `DASHBOARD_URL=https://dashboard.fixmyfashion.gr`
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Deferred (start next session with):**
1. **Diagnose missing orders.** User noted test orders in Shopify tagged with `becasual` but the dashboard shows 0 repairs for be-casual. Our query uses exact tag `repair-b2b-becasual`. Check actual tag format on those test orders in Shopify admin → either re-tag them to match, or (if unavoidable) broaden the query in `lib/shopify.ts` to also match `becasual` / `tag:becasual`.
2. **Wire Judge.me reviews** for the real Customer Rating KPI. Currently Overview hardcodes 4.8 when there are orders and shows `—` when there are zero. Judge.me API filter by brand tag.
3. **KPI tuning pass** — user explicitly wants to change some KPIs once real data is flowing. Ask which ones before editing.
4. **Map polish** — current Greece outline works but looks rough. Consider swapping for a real simplified GeoJSON (e.g. Natural Earth 1:110m).
5. **Optional: Shopify store rename** — user wanted `fixmyfashion.myshopify.com`. Currently stuck with `4xps3i-gg.myshopify.com` until user contacts Shopify Support. Only affects the OAuth URL (not user-visible).

**Snags we solved (so they don't bite again):**
- Resend free tier's `onboarding@resend.dev` only delivers to the account owner's email — must use a verified domain to email anyone else.
- Vercel env values with trailing newlines break URL concatenation (already defended against in `/api/shopify/install`). If weird URL issues return, check env vars for whitespace.
- Shopify's `send` subdomain is load-bearing for Klaviyo NS records — don't touch it. Resend was moved to `updates` subdomain.
- Next.js 16 requires `proxy.ts` exporting a `proxy` function (not `middleware`).
- Hydration errors from browser extensions (ColorZilla `cz-shortcut-listen`) fixed with `suppressHydrationWarning` on `<body>`.

**To resume:** open repo in IDE, run `npm run dev`, check todo item #1 (tag diagnostics) first since it blocks any real data appearing.
