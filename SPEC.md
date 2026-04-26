# FixMyFashion — Brand Admin Dashboard Specification

This document defines exactly what to build, screen by screen, endpoint by endpoint.
Reference this alongside CLAUDE.md. CLAUDE.md has the architecture. This has the detail.

---

## Product Summary

A login-protected web dashboard at dashboard.fixmyfashion.gr where each FixMyFashion
brand partner logs in and sees their repair service performance. Each brand sees only
their own data. The dashboard reads live data from the existing Shopify store.

Target users: marketing directors, sustainability managers, and e-commerce managers
at Greek fashion brands. The UI must feel premium — not a generic SaaS admin tool.

---

## Build Order (do in this sequence)

```
Sprint 1 (Days 1–5):   Project setup + Auth + Shopify data layer           [DONE 2026-04-20]
Sprint 2 (Days 6–12):  Overview tab + Repair Log tab (core value)          [DONE 2026-04-20]
Sprint 3 (Days 13–18): Sustainability tab + Analytics tab                  [DONE 2026-04-20]
Sprint 4 (Days 19–26): Reports tab + Settings tab + polish                 [DONE 2026-04-20]
                        NOTE: Map tab removed from scope — do not build

Bonus shipped same day:
- Superadmin /admin view                                                    [DONE 2026-04-20]
- Shopify OAuth install flow + live Admin API token captured                [DONE 2026-04-21]
- Vercel deploy + custom domain dashboard.fixmyfashion.gr (SSL)            [DONE 2026-04-21]
- Resend domain verification for fixmyfashion.gr                           [DONE 2026-04-21]

Sprint 5 (Real-data tuning + spec alignment)                              [DONE 2026-04-21]
- Diagnostic endpoint to inspect actual Shopify tags                        DONE
- Status detection rewritten to 3 states (Fulfilled / In workshop / Quote sent) DONE
- All Fulfilled-based metrics (completed, turnaround, sustainability)       DONE
- Overview pipeline reduced to 2 pills (In workshop, Returning to customers) DONE
- Analytics donut now reads job-cat-* / job-type-* tags                     DONE
- Map tab removed from navigation + codebase                                DONE
- Repair Log: search bar, date range, days-in-workshop column added         DONE
- Repair Log: review-score column + repair-type filter dropdown removed     DONE
- Analytics: 3 new KPI cards + regional stat block (no map)                 DONE
- Overview: launch checklist banner + Settings: read-only categories        DONE
- Status chips reduced to 3 states; water saved KPI removed                 DONE
- Reports: date-range Monthly PDF, YTD removed                              DONE
- Supabase columns added: launch_footer_done, launch_email_done,
  launch_packaging_done, next_review_date, report_preference                DONE
- Judge.me service rating wiring                                            DEFERRED to Sprint 6

Sprint 6 (Real-data polish + admin tooling)                              [DONE 2026-04-26]
- S6-C1 customerEmail wired through GraphQL + repeat-customer rate         DONE
- S6-C2 Overview pipeline expanded to 3 counters (Orders / In workshop / Delivered) DONE
- S6-C3 Analytics restructured: ranked category cards + 2 ranked type lists
        (garment-from-title detection deleted)                              DONE
- S6-C4 BrandConfig diagnostic + parseAllowedCategories handles JSON+CSV   DONE
- S6-C5 Judge.me store-rating wiring on Overview                           DONE
- S6-C6 Sustainability tab reduced to 2 cards; Re-repair moved to Analytics DONE
- S6-C7 hello@fixmyfashion.gr → support@fixmyfashion.gr everywhere         DONE
- S6-C8 Admin: per-brand launch-checklist editor (no SQL needed)           DONE
- S6-C9 Admin: brand impersonation flow + exit banner                      DONE
- S6-C10 Empty-state polish (NoRepairsYet, gated chart placeholders)       DONE
- S6-C11 Microsoft Clarity snippet (env-gated by NEXT_PUBLIC_CLARITY_PROJECT_ID) DONE

Carry-over (Shopify-side, not code):
- S6-Y1 Create 12 job-cat-* / job-type-* tags in Shopify Admin             PENDING
- S6-Y2 Shopify Flow: brand_source attr → repair-b2b-{value} tag           DONE 2026-04-27
        Implemented as TWO active Flow rules (per-brand, not one dynamic Liquid rule):
          • "Brand Repair tag"     — generic catch-all
          • "Becasual Repair tag"  — be-casual specific
        ⚠️ Each new brand needs a new Flow rule until consolidated into one Liquid rule.
- S6-Y3 Backfill be-casual test orders with workflow + classification tags PENDING

Sprint 7 (next session): TBD — user will define at session start
```

---

## Sprint 1 — Foundation

### 1.1 Project Setup

```bash
npx create-next-app@latest fixmyfashion-dashboard \
  --typescript --tailwind --app --no-src-dir
cd fixmyfashion-dashboard
npm install recharts @supabase/supabase-js resend jose
```

### 1.2 Auth Flow — Magic Link

1. Brand user visits /login, enters email
2. Resend sends magic link to /auth/verify?token=xxx
3. Server validates token, sets HttpOnly JWT cookie: { brandHandle, brandName, brandEmail }
4. Redirect to /dashboard/overview. Cookie expires 30 days.

`POST /api/auth/send-link` — look up email in brand_sessions, generate token, send via Resend.
`GET /api/auth/verify?token=xxx` — validate token, set cookie, redirect.
`POST /api/auth/logout` — clear cookie, redirect to /login.

Route protection: middleware (proxy.ts) checks JWT on all /dashboard/* and /admin/* routes.

### 1.3 Shopify Data Layer — /lib/shopify.ts

```typescript
const SHOPIFY_ENDPOINT =
  `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/graphql.json`

async function shopifyQuery(query: string, variables?: Record<string, unknown>) {
  const response = await fetch(SHOPIFY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
  })
  const data = await response.json()
  if (data.errors) throw new Error(data.errors[0].message)
  return data.data
}
```

Key functions:
```typescript
async function getBrandOrders(brandHandle: string): Promise<ShopifyOrder[]>
async function getBrandConfig(brandHandle: string): Promise<BrandConfig>
async function getBrandStats(brandHandle: string): Promise<BrandStats>
```

TypeScript types:
```typescript
interface ShopifyOrder {
  id: string
  name: string
  createdAt: string
  tags: string[]
  financialStatus: string
  shippingAddress: { city: string } | null
  lineItems: LineItem[]
  fulfillments: Fulfillment[]
}

interface LineItem {
  title: string
  price: { amount: string }
}

interface Fulfillment {
  createdAt: string
  status: string
}

interface BrandConfig {
  brandHandle: string
  brandName: string
  brandLogo: string
  primaryColor: string
  portalUrl: string
  allowedCategories: string[]
  discountCode: string | null
}
```

---

## Sprint 2 — Core Tabs

### 2.1 Dashboard Layout

All /dashboard/* pages share:
- Header: brand avatar (initials) + brand name + "Repairs by FixMyFashion"
  - Brand primary color as avatar bg; default #0F6E56 if none set
- Tab navigation: 6 tabs — Overview / Sustainability / Repair Log / Analytics / Reports / Settings
  - Active tab in brand primary color
  - NO Map tab — removed from scope
- Content: white bg, 24px padding

### 2.2 Overview Tab

**KPI Cards (top row, 4 cards):**

| Card | Value | Sub-label |
|------|-------|-----------|
| Repairs this month | Fulfilled orders in current calendar month | "+X% vs last month" |
| All-time repairs | Total Fulfilled orders for brand | "Since [first order date]" |
| FMF service rating | Judge.me store-level avg score | "FixMyFashion service rating · N reviews" |
| Avg turnaround | Mean days: order.createdAt → fulfillments[0].createdAt | "Target: 7 days" |

Notes:
- "Fulfilled orders" = orders where fulfillments array is not empty
- Judge.me rating is store-level only (not per-brand). Label: "FixMyFashion service rating"
- Turnaround: use order.createdAt → fulfillments[0].createdAt (Shopify does not expose tag timestamps)

**Pipeline row (3 counters):**

| Counter | Source | Color |
|---------|--------|-------|
| Orders | All orders tagged repair-b2b-[brandHandle] | Gray #6b7280 |
| In workshop | tag repair-in-progress + fulfillments empty | Blue #185FA5 |
| Delivered | fulfillments not empty | Teal #0F6E56 |

**Brand launch checklist callout:**
Yellow banner if not all 3 touchpoints active:
"Activate all 3 promotion touchpoints to reach 45+ repairs/month"
- Footer link added ✓
- Post-purchase email live ✓
- Packaging insert ordered ✓
Read from Supabase brand_sessions (launch_footer_done, launch_email_done, launch_packaging_done).
Hide banner when all 3 are true.

**Monthly volume chart:**
- Recharts LineChart
- X: last 6 months (abbreviated names)
- Y: count (starts at 0)
- Data: Fulfilled orders grouped by createdAt month
- Single teal line with area fill

**Loading:** skeleton cards while fetching. Never show empty/broken charts.

### 2.3 Repair Log Tab

**Search bar (above filters):**
Text input — search by order ID (#FMF-XXXX) or Shopify order name. Client-side.

**Filters:**
- Status dropdown: All / Quote sent / In workshop / Dispatched
  - Quote sent: tag repair-quote-sent, fulfillments empty
  - In workshop: tag repair-in-progress, fulfillments empty
  - Dispatched: fulfillments not empty
- Date range picker: from → to date

All filters client-side on fetched orders array.

**Table columns:**
```
Order ID        "#FMF-" + last 4 digits of Shopify order name
Date            Relative for <14d ("3d ago"), actual date for older. Full datetime on hover.
Repair          Line item product title, truncated at 30 chars, full on hover
Status          Colored chip — 3 states only (see UI tokens)
Customer paid   "€XX" from line item price
Days in workshop  Days since order.createdAt for repair-in-progress orders (fulfillments empty)
                  Show "—" for other statuses. Amber if >10 days.
```

Removed: Review score column (no per-order Judge.me data).
Removed: Repair type filter dropdown (use Analytics tab for type breakdown).
Garment type badge: optional subtle secondary label only — not a primary column.

**Pagination:** 20 per page, Previous/Next.
**Footer:** "Showing X–Y of Z repairs · Customer IDs anonymised per GDPR"

---

## Sprint 3 — Data Tabs

### 3.1 Sustainability Tab

**Impact cards (2 cards):**
```
CO2 saved          Fulfilled orders × 3 kg                  kg
Garments kept in use  Fulfilled orders count               count
```

"Fulfilled orders" = orders where fulfillments array is not empty.
Water saved removed — methodology not defensible for sustainability reports.
Re-repair rate moved to Analytics tab (Sprint 6) — single home for the metric.

**Benchmark note:**
"~3 kg CO₂ saved per garment repaired vs replaced (WRAP UK, 2023)."

**CO2 cumulative chart:**
- Recharts BarChart
- X: months; Y: cumulative kg CO2 (running total, not monthly delta)
- Data: Fulfilled orders by month × 3kg, accumulated
- Teal bars

**Badge section:**
- Preview of co-branded badge (dark teal, brand name + stats)
- Download PNG (canvas, 300dpi) + Download SVG buttons

### 3.2 Analytics Tab

**KPI cards (top row, 3 cards):**
- Repeat repair customers %: unique emails with 2+ Fulfilled orders ÷ total unique repair customer emails
- Re-repair rate %: same calculation as Sustainability tab
- Delivered within 7 days %: Fulfilled where (fulfillments[0].createdAt - createdAt) ≤ 7d ÷ total Fulfilled
  Display as "87% (26 of 30 repairs)". Flag amber if <80%.

**Section 1 — Service category (ranked cards):**
Data source: job-cat-* tags — NOT product title keyword parsing.

```typescript
const category = tags.find(t => t.startsWith('job-cat-'))?.replace('job-cat-', '') ?? 'unknown'
```

- Ranked cards for the 4 categories: repair / alteration / cleaning / colour
- Each card: name + count + % + progress bar
- Colors: teal (repair), blue (alteration), amber (cleaning), purple (colour)
- Gate: <10 classified orders → "Service mix available from 10 classified orders"

**Section 2 — Job type breakdown (two ranked lists):**
Data source: job-type-* tags. Cleaning + colour have NO type breakdown (Section 1 only).

- Chart A — Repair types (job-cat-repair only): seam / button / hole / zipper / other
  Gate: <5 repair orders → placeholder
- Chart B — Alteration types (job-cat-alteration only): height / width / other
  Gate: <5 alteration orders → placeholder

Garment-from-title detection removed entirely (unreliable).

**Monthly stacked bar:**
- X: last 6 months; Y: order count; Stacked by job-cat-* (4 series)
- Gate: placeholder if <50 repairs/month

**Regional breakdown (simple stat block — no map):**
- % Attica | % Central Macedonia | % Rest of Greece
- Source: shippingAddress.city grouping

**Satisfaction trend (gated):**
- Only render at 50+ total store reviews
- Below: show avg rating text only. Above: 6-month line chart.

---

## Sprint 4 — Remaining Tabs + Polish

### 4.1 Reports Tab

**Download cards (3 cards):**

| Card | Label | Button | Notes |
|------|-------|--------|-------|
| Monthly report | "April 2026" + date range selector | Download PDF | Default = current month; user can change range |
| Repair data | "CSV export" | Download CSV | All Fulfilled orders |
| Sustainability certificate | "Q[N] [Year]" | Download PDF | CO2 + garment count, branded |

YTD summary removed — covered by date range selector on Monthly PDF.

**PDF (jsPDF, client-side):**
- Page 1: header, period, KPI summary
- Page 2: charts (html2canvas)
- Page 3: repair log table
- Footer: "Generated by FixMyFashion · dashboard.fixmyfashion.gr"

**CSV:** client-side, Blob + URL.createObjectURL.

**Scheduled delivery:**
- Dropdown: Monthly PDF + CSV / Monthly PDF only / Off
- Save → write to brand_sessions.report_preference
- Email sending deferred — store preference only

### 4.2 Settings Tab

**Section 1: Portal**

| Row | Left | Right |
|-----|------|-------|
| Portal URL | "Your branded repair portal" | URL (read-only, one-click copy) |
| QR code | "For packaging inserts" | Download PNG + SVG |
| Status | "Live since [date]" | Green "Active" badge |

**Section 2: Brand launch checklist**
Read-only status from Supabase (FMF marks these — not user-editable):
- [ ] Footer link added to brand website
- [ ] Post-purchase email live
- [ ] Packaging insert ordered

**Section 3: Allowed repair categories**
Read-only list of chips from BrandConfig allowedCategories.
Below: "Need to change? Contact support@fixmyfashion.gr"
NOT toggles. Do not call Shopify API. No "Request update" button.

**Section 4: Support**

| Row | Left | Right |
|-----|------|-------|
| Account manager | "Giorgos Gklavas · FixMyFashion" | Contact (mailto) + Calendly link |
| Next quarterly review | "Scheduled with your account manager" | Date from Supabase |

No tier, no pricing, no plan information anywhere.

### 4.3 Superadmin View (/admin)

- Login via role=admin in brand_sessions
- Table: all brands — name, portal URL, total repairs, this month, avg rating, status
- Clickable rows → impersonate brand dashboard
- Brand launch checklist management: FMF marks items complete per brand
- Category change requests queue
- Functional table — no complex UI needed

---

## Map Tab — REMOVED FROM SCOPE

Do not build. Do not add to navigation.
Regional breakdown moved to Analytics tab as a simple stat block.
ELTA vs BoxNow chart removed entirely — internal FMF metric, not brand-facing.
Revisit map in Year 2 when brands reach 500+ repairs/month.

---

## Additional Supabase Tables

```sql
CREATE TABLE category_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_handle text NOT NULL,
  requested_categories text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE brand_sessions
  ADD COLUMN IF NOT EXISTS report_preference text DEFAULT 'monthly_pdf_csv',
  ADD COLUMN IF NOT EXISTS next_review_date date,
  ADD COLUMN IF NOT EXISTS launch_footer_done boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS launch_email_done boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS launch_packaging_done boolean DEFAULT false;

CREATE TABLE admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  last_login_at timestamptz
);
```

---

## UI Design Tokens

```css
--color-teal:        #0F6E56;
--color-teal-light:  #E1F5EE;
--color-teal-mid:    #5DCAA5;
--color-amber:       #BA7517;
--color-blue:        #185FA5;
--color-purple:      #534AB7;

--color-text-primary:   #1a1a1a;
--color-text-secondary: #6b7280;
--color-border:         rgba(0,0,0,0.1);
--color-bg-secondary:   #f9fafb;

/* Status chip colors — 3 states only */
.chip-quote-sent   { background: #F1EFE8; color: #5F5E5A; }       /* gray */
.chip-in-workshop  { background: #E6F1FB; color: #185FA5; }       /* blue */
.chip-dispatched   { background: #E1F5EE; color: #0F6E56; font-weight: 500; }  /* teal */

/* Removed: chip-received, chip-confirmed, chip-qa-complete, chip-delivered */
```

---

## Error Handling Rules

- Every API route: `{ data: T } | { error: string, code: string }`
- Every tab: error boundary → "Something went wrong loading this data. Try refreshing."
- Shopify errors: log server-side, show generic message
- Auth errors: redirect to /login
- Empty state (0 repairs): "No repairs yet — your portal is live and ready." + portal link
- Charts with insufficient data: placeholder message, never broken/empty chart

---

## Testing Checklist (before each deployment)

- [ ] Login flow works end-to-end
- [ ] Brand A cannot see Brand B's data
- [ ] All 6 tabs load without console errors (no Map tab in nav)
- [ ] Overview: 3 pipeline counters (Orders + In workshop + Delivered)
- [ ] Overview: repair counts match Shopify admin (Fulfilled orders)
- [ ] Overview: Judge.me service rating renders (or "—" if env vars missing)
- [ ] Repair Log: 3 status filter options + date range picker + search bar
- [ ] Repair Log: no review score column, no repair type filter
- [ ] Sustainability: 2 cards only (CO2, Garments kept in use); Re-repair lives on Analytics
- [ ] Analytics: ranked category cards (no donut) + 2 ranked type lists (repair / alteration)
- [ ] Analytics: regional breakdown shows 3 stats (not a map)
- [ ] Settings: categories shown as read-only list (not toggles)
- [ ] Settings: launch checklist reads from Supabase
- [ ] PDF download produces readable file
- [ ] CSV download opens correctly in Excel
- [ ] QR code scans to correct portal URL
- [ ] Mobile: all tabs readable at 375px
- [ ] `npm run build` passes with 0 errors and 0 TypeScript errors
