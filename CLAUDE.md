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
- Subdomain detected in `theme.liquid` → sets `brand_source` cart attribute automatically
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

### Order Tags — final confirmed list

**Workflow tags (applied manually by FMF):**
```
repair-quote-sent     → FMF sends Shopify invoice to customer
repair-in-progress    → Garment physically at workshop; repair underway
repair-b2b-[handle]   → Brand identifier e.g. repair-b2b-becasual
                        AUTO-applied via Shopify Flow from brand_source cart attribute
                        One Flow rule handles all brands dynamically
```

**Service classification tags (applied at intake alongside repair-in-progress):**
```
Category — pick ONE per order:
  job-cat-repair        → repair service
  job-cat-alteration    → alteration service
  job-cat-cleaning      → cleaning (no type tag needed)
  job-cat-colour        → colour service (no type tag needed)

Type — pick ONE per order (repairs + alterations only):
  job-type-repair-seam    → seam repair
  job-type-repair-button  → button repair
  job-type-repair-hole    → hole repair
  job-type-repair-zipper  → zipper repair
  job-type-repair-else    → other repair (catch-all)
  job-type-alter-height   → hem / length alteration
  job-type-alter-width    → waist / width alteration
  job-type-alter-else     → other alteration (catch-all)
```

**REMOVED tags — do NOT reference anywhere in code:**
```
repair-confirmed    REMOVED — no COD, card payments only
repair-received     REMOVED — merged into repair-in-progress
repair-completed    REMOVED — no QA stage in brand view
repair-dispatched   REMOVED — Fulfilled order status replaces this
repair-delivered    REMOVED — no delivery confirmation tag
repair-cod          REMOVED — no cash on delivery
```

### Klaviyo Email Flows (final, confirmed)
```
Email #1: "Επιβεβαίωση — ξεκινάμε!"
  Trigger: Klaviyo "Placed Order" metric (fires on card payment completion)
  Status: LIVE ✅

Email #2: "Το ρούχο σου επιστρέφει!"
  Trigger: Klaviyo "Fulfilled Order" metric (fires when FMF fulfills + adds tracking)
  Status: LIVE ✅

Review request: "Πώς τα πήγαμε;"
  Trigger: 7 days after Fulfilled Order metric
  Status: LIVE ✅

DEFERRED: Quote received email (Globo → Klaviyo trigger not yet working).
          Customer sees /pages/thank-you-quote. Fix in future session.
NO COD flow. NO Email #4. Card payments only.
```

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
Database:       Supabase (free tier) — auth/session state only in Stage 1
Data:           Shopify Admin GraphQL API
Styling:        Tailwind CSS
Charts:         Recharts
Language:       TypeScript
Version control: GitHub
```

### Key Architecture Decisions (final, do not revisit)
1. Real-time data: Shopify API on every page load — no caching in Stage 1
2. Per-brand isolation: JWT contains brandHandle; all Shopify queries filter by `repair-b2b-[brandHandle]`
3. No brand tier/pricing shown anywhere in dashboard UI
4. Category changes require FMF approval — show read-only list + "Request change" contact link. Do NOT show toggles. Do NOT call Shopify API.
5. Sustainability: 3kg CO2 per repair (WRAP UK). Water saved metric removed.
6. Superadmin /admin: separate login, build after core dashboard
7. Stage 2 (future): Supabase mirrors Shopify orders via webhooks; no UI changes needed
8. No COD anywhere — card payments only
9. Judge.me is store-level only — show as "FixMyFashion service rating", same for all brands
10. Map tab removed from scope — do not build

---

## Data Model

### Brand identity
Source: Shopify BrandConfig metaobject filtered by brand_handle

### Repair orders
Source: Shopify orders filtered by tag `repair-b2b-[brandHandle]`

### Key order fields
```
id                  → display as #FMF-{last 4 of name}
name                → Shopify order name
createdAt           → order creation date
tags                → status + service classification
lineItems           → repair description (product title) + price
fulfillments        → createdAt = dispatch date (used for turnaround)
financialStatus     → always PAID for active orders
shippingAddress     → city (for regional breakdown in Analytics)
```

### Status detection — 3 states only
```javascript
// Priority order — most advanced first
if (order.fulfillments?.length > 0)        → status = 'Dispatched'
if (tags.includes('repair-in-progress'))   → status = 'In workshop'
if (tags.includes('repair-quote-sent'))    → status = 'Quote sent'
```

### Turnaround time calculation
```javascript
// Days from workshop intake to dispatch
// repair-in-progress tag date → fulfillments[0].createdAt
// Note: Shopify GraphQL does not expose tag-change timestamps.
// Practical workaround: fulfillments[0].createdAt - order.createdAt (conservative)
// Target SLA: ≤ 7 days workshop-to-dispatch
```

### Service classification (from tags)
```javascript
const category = tags.find(t => t.startsWith('job-cat-'))?.replace('job-cat-', '') ?? 'unknown'
// 'repair' | 'alteration' | 'cleaning' | 'colour' | 'unknown'

const jobType = tags.find(t => t.startsWith('job-type-'))?.replace('job-type-', '') ?? 'other'
// 'repair-seam' | 'repair-button' | 'repair-hole' | 'repair-zipper' | 'repair-else'
// 'alter-height' | 'alter-width' | 'alter-else' | 'other'
```

### Completed repairs
```javascript
// Fulfilled orders = dispatched to customer
const completedRepairs = orders.filter(o => o.fulfillments?.length > 0)
```

### Sustainability calculations
```javascript
const CO2_PER_REPAIR = 3  // kg (WRAP UK benchmark)
co2Saved      = completedRepairs.length * CO2_PER_REPAIR
garmentsSaved = completedRepairs.length  // label: "Garments kept in use"
// Water saved removed — methodology not defensible for sustainability reports
```

### Review score
Source: Judge.me public API — store-level avg score only.
Label: "FixMyFashion service rating". Same value for all brands.
Do NOT filter by brand tag — not supported.

---

## Dashboard — 6 Tabs

### Tab 1: Overview
- 4 KPI cards: repairs this month (+MoM% delta) | all-time repairs | FMF service rating (Judge.me store avg) | avg turnaround days
- 2 pipeline counters: "In workshop" (repair-in-progress, not Fulfilled) | "Returning to customers" (Fulfilled, last 10 days)
- Line chart: monthly volume — Fulfilled orders by month, last 6 months
- Brand launch checklist callout if touchpoints incomplete (footer / post-purchase email / packaging)

### Tab 2: Sustainability
- 3 KPI cards: CO2 saved (kg) | Garments kept in use | Re-repair rate %
- Cumulative CO2 bar chart: Fulfilled orders × 3kg, running total by month
- Downloadable badge: PNG (300dpi) + SVG, co-branded with brand stats
- Benchmark note: "~3 kg CO₂ saved per garment repaired vs replaced (WRAP UK)"

### Tab 3: Repair Log
- Search bar: order ID (#FMF-XXXX or Shopify order number)
- Filters: status (Quote sent / In workshop / Dispatched) + date range picker
- Columns: Order ID | Date (relative <14d, absolute older) | Repair type (line item title) | Status chip | Customer paid (€) | Days in workshop (in-workshop orders only, amber if >10d)
- Pagination: 20 per page
- No repair type filter dropdown (cut). No review score column (cut).

### Tab 4: Analytics
- KPI cards: Repeat repair customers % | Re-repair rate % | % delivered within 7 days
- Donut chart: job-cat-* outer ring (4 categories) + job-type-* inner ring (repair + alteration types). Gate: <10 tagged orders → show placeholder.
- Monthly stacked bar: orders by job-cat-* per month, last 6 months. Gate: <50 repairs/month → placeholder.
- Product insights cards: top garment × job-type combinations, top 6 by frequency, with progress bar.
- Regional breakdown: % Attica / % Central Macedonia / % Rest (from shippingAddress.city)
- Satisfaction trend: gated at 50+ total reviews; below threshold show avg rating only.

### Tab 5: Reports
- 3 download cards: Monthly PDF (date range selector) | CSV export | Sustainability certificate PDF
- Scheduled delivery preference (store in Supabase — email sending deferred)

### Tab 6: Settings
- Portal URL (read-only, one-click copy)
- QR code download (PNG + SVG)
- Allowed categories: read-only list + "Request change → hello@fixmyfashion.gr"
- Brand launch checklist: footer link ✓ | post-purchase email ✓ | packaging insert ✓ (set by FMF in Supabase)
- Account manager: Giorgos Gklavas + Calendly link
- Next quarterly review date

### Map tab — REMOVED
Do not build. Removed from scope. Do not add to navigation.

---

## Project Structure

```
/app
  /dashboard
    /page.tsx                  → redirect to /dashboard/overview
    /overview/page.tsx
    /sustainability/page.tsx
    /log/page.tsx
    /analytics/page.tsx
    /reports/page.tsx
    /settings/page.tsx
    NOTE: no /map/ page — tab removed
  /login/page.tsx
  /auth/verify/page.tsx
  /admin/page.tsx
/api
  /auth/send-link/route.ts
  /auth/verify/route.ts
  /auth/logout/route.ts
  /brand/config/route.ts
  /repairs/route.ts
  /repairs/stats/route.ts
/components
  /dashboard/
  /charts/
  /ui/
/lib
  /shopify.ts
  /auth.ts
  /sustainability.ts
  /supabase.ts
```

---

## Environment Variables

```bash
SHOPIFY_STORE_DOMAIN=4xps3i-gg.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
JWT_SECRET=...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=FixMyFashion <dashboard@fixmyfashion.gr>
DASHBOARD_URL=https://dashboard.fixmyfashion.gr
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Supabase Schema

```sql
CREATE TABLE brand_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_handle text NOT NULL,
  brand_name text NOT NULL,
  brand_email text NOT NULL,
  role text DEFAULT 'brand',
  magic_token text,
  token_expires_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  report_preference text DEFAULT 'monthly_pdf_csv',
  next_review_date date
);

CREATE TABLE magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_handle text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE category_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_handle text NOT NULL,
  requested_categories text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  last_login_at timestamptz
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
        shippingAddress {
          city
        }
        lineItems(first: 5) {
          edges {
            node {
              title
              price { amount }
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
    pageInfo { hasNextPage }
  }
}
```

### Fetch BrandConfig metaobject
```graphql
query GetBrandConfig {
  metaobjects(type: "brand_config", first: 50) {
    edges {
      node {
        fields { key value }
      }
    }
  }
}
```

---

## Coding Conventions

- TypeScript everywhere
- All Shopify API calls server-side only
- JWT is HttpOnly cookie — never expose to browser JS
- Every API route checks auth first
- Tailwind for all styling
- Recharts for all charts
- Loading skeletons on every data-fetching component
- Error boundaries on every tab
- All monetary values in EUR (€)
- Dates: relative ("3d ago") for <14 days, actual date for older entries

---

## What NOT To Do

- Do not modify Shopify theme files
- Do not create new Shopify products or collections
- Do not send emails from the dashboard — Klaviyo handles all customer emails
- Do not store repair orders in Supabase in Stage 1
- Do not expose Shopify Admin token in client-side code
- Do not show brand tier or monthly fee in any brand-facing UI
- Do not call Shopify to update allowed_categories
- Do not use removed tags: repair-confirmed, repair-received, repair-completed, repair-dispatched, repair-delivered, repair-cod
- Do not attempt per-brand Judge.me filtering
- Do not build the Map tab

---

## Session Checklist

Start of session:
1. Read CLAUDE.md
2. Read SPEC.md for the feature being built
3. Check existing files before creating new ones
4. Run `npm run dev` and confirm app starts

End of session:
1. `npm run build` — must pass with 0 errors
2. Commit all working changes
3. Note incomplete work below

---

## Session Notes

### 2026-04-20 → 2026-04-21 — Initial build + deploy (Session 1)

**Repo:** https://github.com/geogklavas/fixmyfashion-dashboard
**Live:** https://dashboard.fixmyfashion.gr
**Working dir:** `c:\Users\George Gklavas\Desktop\FMF ADMIN\fixmyfashion-dashboard`

**Shipped:**
- Next.js 16 + TS + Tailwind + App Router
- Magic-link auth (Resend + JWT via jose, 30d HttpOnly cookie)
- Supabase tables: brand_sessions, magic_links, category_change_requests
- role column on brand_sessions (brand | admin)
- Shopify Admin GraphQL client + mock-data fallback (lib/data.ts + lib/mock.ts)
- All 6 brand tabs + superadmin /admin
- Shopify OAuth install flow (/api/shopify/install → /api/shopify/callback)
- Custom domain dashboard.fixmyfashion.gr via Papaki CNAME
- Resend domain verified (updates subdomain — not send, which Klaviyo uses)
- PDF + CSV exports (jsPDF), QR code (qrcode), sustainability badge (SVG + canvas PNG)
- proxy.ts protects /dashboard/* and /admin/*

**Live Supabase accounts:**
- geo.gklavas@gmail.com → role=admin, handle=admin
- info@be-casual.gr → role=brand, handle=becasual

**Deferred — start Session 2 with these in order:**
1. **Fix missing orders.** Query uses `repair-b2b-becasual` tag. Check test orders in Shopify Admin — do they have this exact tag? If not: manually add to existing test orders. Set up Shopify Flow rule (task F4c) for future orders: brand_source cart attribute → apply tag repair-b2b-[value] automatically.
2. **KPI tuning pass.** Update dashboard components to match corrected CLAUDE.md + SPEC.md: 2 pipeline pills (not 4), turnaround calc (repair-in-progress → Fulfilled), 3-state status detection, sustainability from Fulfilled orders, Analytics donut from job-cat-*/job-type-* tags.
3. **Remove Map tab** from navigation and codebase — tab cut from scope.
4. **Judge.me** — show store-level avg as "FixMyFashion service rating" on Overview. No per-brand filtering.

**Known snags:**
- Resend free tier only delivers to account owner — must use verified domain for all brand emails
- Vercel env trailing newlines break URL concat — check if weird URL issues appear
- Shopify send subdomain = Klaviyo NS records, do not touch. Resend uses updates subdomain.
- Next.js 16: proxy.ts not middleware.ts
- Hydration errors from ColorZilla browser extension fixed with suppressHydrationWarning on body

### 2026-04-21 — Sprint 5: KPI tuning + spec alignment (Session 2)

**Repo:** https://github.com/geogklavas/fixmyfashion-dashboard
**Live:** https://dashboard.fixmyfashion.gr
**Last commit pushed:** `5f89ac3` (Sprint 5 Group 4: polish)

User overwrote CLAUDE.md + SPEC.md at the start of this session with corrected versions; everything below conforms to those. The full sprint shipped in 4 ordered commits:

| Commit | Group | What it covers |
|--------|-------|----------------|
| `e9cb752` | 1 + 2 | data model rewrite + cut features |
| `f70cb06` | 3 | Analytics KPIs, launch checklist, read-only Settings |
| `5f89ac3` | 4 | 3-state status chips + Reports date-range selector |
| `f1b5cc4` (Session 1 wrap-up) | — | docs in repo root |

**Group 1 — data model corrections (e9cb752):**
- `detectStatus(order)` now returns 3 states only — `Dispatched` (fulfillments.length > 0), `In workshop` (`repair-in-progress` tag, no fulfillment), `Quote sent` (`repair-quote-sent` tag). Signature changed from `(tags)` to `(order)` — all callers updated.
- All "completed/dispatched" logic uses `order.fulfillments.length > 0`, never the old `repair-delivered` tag (which is removed from spec).
- `thisMonthCount` / `lastMonthCount` / `monthlyVolume` count Fulfilled orders by **fulfillment month** (throughput), not createdAt.
- `pipelineCounts` returns `{ inWorkshop, returningRecently }` — Returning = Fulfilled in last 10 days.
- New helpers in `lib/data.ts`: `fulfilledOrders`, `deliveredWithinDays`, `repeatCustomerRate`, `jobCategoryBreakdown`, `jobTypeBreakdown`, `classifiedOrderCount`, `monthlyByCategory`, `regionBreakdown` (orders-based now, not city array).
- `ShopifyOrder` type extended with `customerEmail` and `shippingCity`. GraphQL query in `lib/shopify.ts` now requests `email` and `shippingAddress.city`.
- `CO2_PER_REPAIR = 3` kg (WRAP UK). `WATER_PER_REPAIR` removed entirely.
- Greek garment keyword matching added to `detectGarmentFromTitle` (μπουφ, παλτ, παντ, πουκ, πλεκτ, φουστ, φορεμ).
- Mock data generator (`lib/mock.ts`) rewritten: drops removed tags, emits `job-cat-*`/`job-type-*` tags + `customerEmail` + `shippingCity` so the dashboard renders meaningfully without a Shopify token.

**Group 2 — removals (e9cb752):**
- `app/dashboard/map/` deleted (page + folder).
- `components/charts/RepairTypeDonut.tsx`, `PickupMethodChart.tsx`, `SatisfactionLineChart.tsx`, `components/dashboard/GreeceMap.tsx` all deleted.
- `lib/tokens.ts` `DASHBOARD_TABS` reduced to 6 entries (no Map).
- Repair Log: review-score column dropped, repair-type filter dropdown dropped.
- Overview: customer satisfaction line chart removed.

**Group 3 — additions (f70cb06):**
- Analytics: 3 new KPI cards (Repeat repair customers %, Re-repair rate %, Delivered within 7 days % — amber if <80%) + regional stat block (% Attica / % Central Macedonia / % Rest of Greece). Service donut gated at 10 classified orders, monthly stack gated at 50 repairs/month peak — both show placeholder copy below threshold.
- Overview: amber `LaunchChecklistBanner` shows above KPIs when any of footer/email/packaging is incomplete; auto-hides when all 3 done.
- Settings: categories now read-only chips with "Need to change? Contact hello@fixmyfashion.gr" link. New "Brand launch checklist" section. Support row now has Contact + Calendly link. Next quarterly review pulls from `brand_sessions.next_review_date`.
- New `lib/launch-checklist.ts` reads checklist + next review date with graceful defaults if columns don't exist yet.
- Removed `components/dashboard/CategoryToggles.tsx` and `app/api/settings/categories/` route.

**Group 4 — polish (5f89ac3):**
- `lib/tokens.ts` `statusChip` palette reduced to 3: `Quote sent` (gray), `In workshop` (blue), `Dispatched` (teal). Plus `Pending` fallback.
- Reports: YTD card removed. Monthly PDF card replaced with date-range selector — From/To inputs + "This month / Last 30d / Last 90d" quick presets. PDF download filters rows to chosen range.

**Supabase migration applied this session:**
```sql
ALTER TABLE brand_sessions
  ADD COLUMN IF NOT EXISTS launch_footer_done boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS launch_email_done boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS launch_packaging_done boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_review_date date,
  ADD COLUMN IF NOT EXISTS report_preference text DEFAULT 'monthly_pdf_csv';

UPDATE brand_sessions
  SET launch_footer_done = true,
      launch_email_done = true,
      launch_packaging_done = false,
      next_review_date = '2026-07-15'
  WHERE brand_handle = 'becasual';
```

**End-of-session state (verified live in browser by user):**
- Overview: amber banner shows footer ✓ / email ✓ / packaging ⏳; KPIs all `0` / `—` because be-casual has no Fulfilled orders yet; pipeline 0 / 0; volume chart empty.
- Sustainability: 3 cards (CO₂ / Garments kept in use / Re-repair %), all 0.
- Repair Log: empty state, search + 3 status filter + date range.
- Analytics: 3 new KPI cards (all 0%), service donut gated `(0/10)`, monthly stack gated `(peak: 0)`, no regional block (no shipping cities yet).
- Reports: date-range PDF + CSV + Q2 2026 sustainability cert.
- Settings: read-only categories, launch checklist mirrors banner state, Next quarterly review = 15 July 2026, Calendly + Contact links.
- Nav: 6 tabs, no Map.

**Why be-casual still shows zeros (not a bug):**
The dashboard query is `tag:repair-b2b-becasual`. Test orders in Shopify carry `brand_source: becasual` (cart attribute) but no `repair-b2b-becasual` tag yet — Shopify Flow that converts attribute → tag is not configured. Existing `/api/admin/shopify-diagnostic` endpoint shows current store state.

**To resume Session 3:**
1. Open repo in IDE; `npm run dev`.
2. Read CLAUDE.md (root + repo copy) and the new SPEC.md "Sprint 6" section once user has populated it.
3. User will define Sprint 6 scope at session start — do not assume.
