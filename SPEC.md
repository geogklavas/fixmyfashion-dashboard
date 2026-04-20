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
Sprint 4 (Days 19–26): Map tab + Reports tab + Settings tab + polish       [DONE 2026-04-20]

Bonus shipped same day:
- Superadmin /admin view (originally planned for "build last")             [DONE 2026-04-20]
- Shopify OAuth install flow + live Admin API token captured               [DONE 2026-04-21]
- Vercel deploy + custom domain dashboard.fixmyfashion.gr (SSL)            [DONE 2026-04-21]
- Resend domain verification for fixmyfashion.gr                           [DONE 2026-04-21]

Sprint 5 (next session): Real-data tuning
- Diagnose be-casual test orders not appearing (tag-format mismatch)
- Wire Judge.me reviews API for real Customer Rating KPI
- KPI tuning pass (user has specific KPIs to adjust)
- Optional: Greece map polish with proper GeoJSON
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

Connect to GitHub. Connect repo to Vercel. Configure custom domain: dashboard.fixmyfashion.gr.
Add all environment variables to Vercel dashboard before first deploy.

### 1.2 Auth Flow — Magic Link

**How it works:**
1. Brand user visits dashboard.fixmyfashion.gr/login
2. Enters their email address (must match a row in Supabase brand_sessions table)
3. Clicks "Send login link"
4. Resend sends an email: "Your FixMyFashion dashboard link" with a button
5. User clicks link → /auth/verify?token=xxx
6. Server validates token (not expired, not used, matches brand_handle)
7. Server sets HttpOnly JWT cookie containing: { brandHandle, brandName, brandEmail }
8. User redirected to /dashboard/overview
9. Cookie expires after 30 days

**Login page (/login):**
- Clean, minimal design
- FixMyFashion logo at top
- Single email input + "Send login link" button
- After submit: show "Check your email — we've sent a login link to [email]"
- Error states: "Email not recognised" (not in Supabase) | "Something went wrong, try again"
- No password field, no "forgot password", no social login

**Verify page (/auth/verify):**
- Shows loading spinner while validating
- On success: redirect to /dashboard/overview (no message needed)
- On error: "This link has expired or already been used. Request a new one." + link back to /login

**Route protection:**
- Middleware checks for valid JWT cookie on all /dashboard/* routes
- If missing or invalid: redirect to /login
- If valid: extract brandHandle and pass via request headers to server components

**API Routes:**

`POST /api/auth/send-link`
```typescript
// Body: { email: string }
// 1. Look up email in Supabase brand_sessions
// 2. If not found: return 404 { error: 'email_not_found' }
// 3. Generate random token (32 bytes, hex)
// 4. Insert into magic_links table (expires in 15 minutes)
// 5. Send email via Resend with link: {DASHBOARD_URL}/auth/verify?token={token}
// 6. Return 200 { success: true }
```

`GET /api/auth/verify?token=xxx`
```typescript
// 1. Look up token in magic_links — must exist, not used, not expired
// 2. Get brandHandle from magic_links row
// 3. Get brandName from brand_sessions
// 4. Mark token as used
// 5. Update last_login_at in brand_sessions
// 6. Create JWT: { brandHandle, brandName, brandEmail, iat, exp: +30days }
// 7. Set cookie: name='fmf_session', httpOnly, secure, sameSite='lax', maxAge=30days
// 8. Redirect to /dashboard/overview
```

`POST /api/auth/logout`
```typescript
// Clear the fmf_session cookie
// Redirect to /login
```

### 1.3 Shopify Data Layer

File: `/lib/shopify.ts`

```typescript
// Shopify Admin GraphQL client
// All requests go through this file — never call Shopify directly from components

const SHOPIFY_ENDPOINT = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/graphql.json`

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

**Key functions to build in lib/shopify.ts:**

```typescript
// Fetch all orders for a brand (handles pagination automatically)
async function getBrandOrders(brandHandle: string): Promise<ShopifyOrder[]>

// Fetch brand config from metaobject
async function getBrandConfig(brandHandle: string): Promise<BrandConfig>

// Fetch aggregated stats (counts by status, monthly volumes)
// This will do client-side aggregation in Stage 1
async function getBrandStats(brandHandle: string): Promise<BrandStats>
```

**TypeScript types to define:**

```typescript
interface ShopifyOrder {
  id: string
  name: string           // "#1001"
  createdAt: string      // ISO timestamp
  tags: string[]
  financialStatus: string
  lineItems: LineItem[]
  fulfillments: Fulfillment[]
}

interface LineItem {
  title: string          // repair type (product title)
  price: { amount: string }
}

interface BrandConfig {
  brandHandle: string
  brandName: string
  brandLogo: string      // URL
  primaryColor: string   // hex
  portalUrl: string
  allowedCategories: string[]
  discountCode: string | null
}

interface BrandStats {
  totalRepairs: number
  thisMonthRepairs: number
  avgTurnaroundDays: number
  avgSatisfactionScore: number
  pipelineCounts: Record<string, number>
  monthlyVolume: MonthlyData[]
  repairTypeBreakdown: TypeBreakdown[]
}
```

---

## Sprint 2 — Core Tabs

### 2.1 Dashboard Layout

All /dashboard/* pages share a layout with:
- Header: brand avatar (initials) + brand name + "Repairs by FixMyFashion" subtitle
  - Brand primary color used as avatar background
  - No tier or pricing shown
- Tab navigation: 7 tabs, active state in brand primary color (default: #0F6E56 if none set)
- Content area: white background, 24px padding

### 2.2 Overview Tab

**KPI Cards (top row, 4 cards):**

| Card | Value | Sub-label |
|------|-------|-----------|
| Repairs this month | count of orders created in current calendar month | "+X% vs last month" (green if positive) |
| All-time repairs | total order count for brand | "Since [first order date]" |
| Customer rating | avg Judge.me score | "Based on N reviews" |
| Avg turnaround | mean days repair-received → repair-delivered | "SLA: 10 days" |

**Pipeline row (below KPI cards):**
4 pills showing live counts:
- Received (repair-received tag, not yet repair-in-progress)
- In progress (repair-in-progress)
- QA complete (repair-completed)
- Dispatched (repair-dispatched, not yet repair-delivered)

Each pill: large number in stage color (amber/blue/green/purple), small label below.

**Monthly volume chart:**
- Line chart (Recharts)
- X axis: last 6 months (abbreviated month names)
- Y axis: repair count
- Single teal line with area fill
- Data: count orders by created_at month

**Customer satisfaction chart:**
- Line chart (Recharts)
- X axis: last 6 months
- Y axis: 4.0 – 5.0
- Amber line with area fill
- Data: avg review score per month from Judge.me

**Loading states:**
- Skeleton cards while data fetches
- Never show empty/zero charts — show skeleton instead

### 2.3 Repair Log Tab

**Filters (top, horizontal row):**
- Status dropdown: All / Quote sent / Confirmed / Received / In progress / QA complete / Dispatched / Delivered
- Repair type dropdown: All / Zip replacement / Hem adjustment / Seam repair / Button fix / Waist alteration / Knitwear darning / Multi-repair
- Month dropdown: All / [last 6 months as options]

All filters are client-side (filter the already-fetched orders array — no new API calls).

**Table columns:**
```
Order ID       → "#FMF-" + last 4 digits of Shopify order name
Date           → relative ("3d ago", "2w ago") with tooltip showing full date
Type           → 2-letter garment indicator badge (JN=Jeans, JK=Jacket, TR=Trousers, SH=Shirt, KW=Knitwear, DR=Dress)
Repair         → line item product title (truncated at 24 chars)
Status         → colored chip (amber/blue/purple/green per stage)
Price          → "€XX" from line item price
Score          → review score from Judge.me, "—" if not yet reviewed
```

**Garment type detection** (from product title keywords):
```typescript
function detectGarmentType(productTitle: string): string {
  const title = productTitle.toLowerCase()
  if (title.includes('jean') || title.includes('denim')) return 'JN'
  if (title.includes('jacket') || title.includes('coat')) return 'JK'
  if (title.includes('trouser') || title.includes('pant')) return 'TR'
  if (title.includes('shirt') || title.includes('blouse') || title.includes('top')) return 'SH'
  if (title.includes('knit') || title.includes('wool') || title.includes('sweater')) return 'KW'
  if (title.includes('dress') || title.includes('skirt')) return 'DR'
  return '—'
}
```

**Pagination:** 20 rows per page, Previous/Next buttons.
**Footer text:** "Showing X–Y of Z repairs · Customer IDs anonymised per GDPR"

---

## Sprint 3 — Data Tabs

### 3.1 Sustainability Tab

**Impact numbers (4 cards, top):**
```
🌿  CO2 saved        completedRepairs * 3          kg
👕  Garments repaired  completedRepairs             count
💧  Water saved       completedRepairs * 2700        litres (display as "937K" if >1000)
📉  Re-repair rate    rerequests / completedRepairs  %
```
"completedRepairs" = orders with tag repair-delivered.
"rerequests" = orders tagged as repeat repairs (detect from order notes or a specific tag — use 0 if not trackable yet).

**Benchmark disclaimer (small text below cards):**
"Estimates based on standard industry benchmarks: approx. 3 kg CO₂ and 2,700 L water saved per garment repaired vs replaced."

**CO2 cumulative chart:**
- Bar chart (Recharts)
- X: months
- Y: cumulative kg CO2 saved (running total, not monthly delta)
- Teal bars

**Sustainability badge section:**
- Preview of badge (dark teal rectangle): "Repairs by FixMyFashion" + garment count + CO2 stat
- "Download PNG" button (generate canvas, download as image)
- "Download SVG" button (generate SVG markup, download as file)
- Description: "Use this badge on your website, sustainability report, or social posts."

### 3.2 Analytics Tab

**Section 1: Two charts side by side**

Left — Repair type donut (Recharts PieChart, donut):
- Custom HTML legend above chart (no Chart.js default legend)
- Segments: Zip, Hem, Seam, Button, Knitwear, Other
- Colors: teal, blue, amber, purple, gray, lighter gray
- Detect type from product title keywords (zip, hem, seam, button, knit)

Right — Turnaround distribution (bar chart):
- X: day buckets (3d, 4d, 5d, 6d, 7d, 8d, 9d, 10d, 10d+)
- Y: count of repairs in each bucket
- Calculate from repair-received → repair-delivered tag timestamps
- Caption below: "Avg X days · SLA: 10 days · X% on-time"

**Section 2: Monthly stacked bar chart**
- X: last 6 months
- Y: repair count
- Stacked by repair type (same colors as donut)
- Shows how volume and type mix evolve over time

**Section 3: Product Insights**
- Section title: "Product insights"
- Subtitle: "Which garment-repair combinations appear most — useful for product design decisions."
- Grid of cards (2–3 columns, auto-fit)
- Each card:
  ```
  [Garment category]      ← small muted uppercase label
  [Most common repair]    ← medium bold text
  [N repairs · XX%]       ← small muted text
  [──────────────]        ← thin progress bar (teal fill, width = % of total)
  ```
- Sort by repair count descending
- Show top 6 combinations

### 3.3 Map Tab

**Greece map:**
- SVG outline of Greece (simplified paths — use static SVG, not a map library)
- Anonymised pins: circles, size proportional to repair volume
- Athens/Attica: largest pin (expect 60–70% of volume)
- Thessaloniki: second
- Other cities: smaller pins
- Pin colors: dark teal for high volume, medium teal for mid, light teal for low
- Tooltip on hover: city name + repair count
- "Anonymised pickup points. Based on N total repairs." caption below map

**Note on data source for map:**
In Stage 1, the map shows approximate location based on the shipping address city field
on Shopify orders. Parse city from shippingAddress.city. Group by city name. Do not
show individual addresses. Round to nearest 50 repairs for display (anonymisation).

**Regional breakdown (below map):**
3 stats: % Attica, % Central Macedonia, % Rest of Greece

**Pickup method chart:**
- Stacked bar (Recharts)
- X: months
- Y: repair count
- Two series: ELTA (courier pickup) vs BoxNow (locker drop-off)
- Detect from order notes or a specific tag (if not tagged: assume ELTA)
- This is a best-effort split — note: "Based on available logistics data"

---

## Sprint 4 — Remaining Tabs + Polish

### 4.1 Reports Tab

**Download cards (2×2 grid):**

| Card | Label | Button | Format |
|------|-------|--------|--------|
| Monthly report | "April 2026" (current month) | Download PDF | jsPDF |
| Repair data | "CSV export" | Download CSV | client-side CSV generation |
| Sustainability certificate | "Q[N] [Year]" | Download PDF | jsPDF |
| Year-to-date summary | "Jan–[current month]" | Download PDF | jsPDF |

**PDF generation approach (jsPDF):**
```bash
npm install jspdf
```
Generate PDFs entirely client-side. Template:
- Page 1: FixMyFashion + brand logo header, month/period, KPI summary
- Page 2: Charts (use canvas screenshot via html2canvas)
- Page 3: Repair log (table)
- Footer: "Generated by FixMyFashion · dashboard.fixmyfashion.gr"

**CSV generation:**
Client-side only. Map the filtered orders array to CSV rows. Use browser Blob + URL.createObjectURL to trigger download. No server needed.

**Scheduled delivery section:**
- Dropdown: "Monthly PDF + CSV" / "Monthly PDF only" / "Off"
- Save button
- On save: write preference to Supabase brand_sessions.report_preference column
- Actual email sending: not built in this phase — just store the preference

### 4.2 Settings Tab

**Section 1: Your repair portal**

| Row | Left | Right |
|-----|------|-------|
| Portal URL | "Your branded repair portal" | Teal text showing URL (read-only) |
| QR code | "For packaging inserts and in-store use" | "Download PNG" button |
| Portal status | "Live since [date]" | Green "Active" badge |

**QR code generation:**
```bash
npm install qrcode
```
Generate QR code client-side pointing to the brand's portal URL. Download as PNG.

**Section 2: Allowed repair categories**

Display current allowed_categories from BrandConfig metaobject as toggle chips.
When brand clicks a chip to toggle it:
- Change its visual state immediately (optimistic UI)
- When "Request update" is clicked:
  - Show pending message: "Sent to FixMyFashion — changes active within 24h"
  - Write the requested categories to Supabase (new table: category_change_requests)
  - Do NOT call Shopify API to update the metaobject
  - FixMyFashion (superadmin) will apply the change manually

**Section 3: Support**

| Row | Left | Right |
|-----|------|-------|
| Account manager | "Giorgos Gklavas · FixMyFashion" | "Contact" link (mailto:hello@fixmyfashion.gr) |
| Next quarterly review | "Scheduled with your account manager" | Date from Supabase |

No tier, no pricing, no plan information anywhere in this section.

### 4.3 Superadmin View (/admin) — Build Last

- Separate login (different Supabase table: admin_sessions)
- Single page showing all brands in a table:
  - Brand name, portal URL, total repairs, repairs this month, avg satisfaction, status (active/pilot/inactive)
- Clickable rows → view that brand's dashboard (impersonate via query param)
- Category change requests queue (from category_change_requests table)
- No complex UI needed — functional table is sufficient

---

## Additional Supabase Tables (add as needed)

```sql
-- Category change requests (from Settings tab)
CREATE TABLE category_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_handle text NOT NULL,
  requested_categories text NOT NULL,  -- comma-separated
  status text DEFAULT 'pending',       -- pending | approved | rejected
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Report delivery preferences (from Reports tab)
ALTER TABLE brand_sessions
  ADD COLUMN report_preference text DEFAULT 'monthly_pdf_csv';

-- Next review dates (for Settings tab)
ALTER TABLE brand_sessions
  ADD COLUMN next_review_date date;

-- Admin sessions (for /admin route)
CREATE TABLE admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  last_login_at timestamptz
);
```

---

## UI Design Tokens

```css
/* Use these consistently — do not invent new colors */

--color-teal:        #0F6E56;   /* Primary brand: buttons, active tabs, KPI accents */
--color-teal-light:  #E1F5EE;   /* Chip backgrounds, success badges */
--color-teal-mid:    #5DCAA5;   /* Chart fills, borders */

--color-amber:       #BA7517;   /* Warning states, Received stage color */
--color-blue:        #185FA5;   /* In Progress stage color */
--color-purple:      #534AB7;   /* Dispatched stage color */

--color-text-primary:   #1a1a1a;
--color-text-secondary: #6b7280;
--color-border:         rgba(0,0,0,0.1);
--color-bg-secondary:   #f9fafb;

/* Status chip colors */
.chip-received    { background: #FAEEDA; color: #BA7517; }
.chip-in-progress { background: #E6F1FB; color: #185FA5; }
.chip-qa-complete { background: #E1F5EE; color: #0F6E56; }
.chip-dispatched  { background: #EEEDFE; color: #534AB7; }
.chip-delivered   { background: #E1F5EE; color: #0F6E56; font-weight: 500; }
```

---

## Error Handling Rules

- Every API route returns: `{ data: T } | { error: string, code: string }`
- Every tab has an error boundary — on error show: "Something went wrong loading this data. Try refreshing."
- Shopify API errors: log server-side, show generic error to user
- Auth errors: redirect to /login
- Empty states (brand has 0 repairs): show "No repairs yet — your portal is live and ready." with portal link

---

## Testing Checklist (before each deployment)

- [ ] Login flow works end-to-end with a real magic link email
- [ ] Brand A cannot see Brand B's data (test with two brands)
- [ ] All 7 tabs load without console errors
- [ ] Overview tab shows correct repair counts (verify against Shopify admin)
- [ ] Repair Log filters work correctly
- [ ] Sustainability calculations are correct (manually verify against order count)
- [ ] Settings "Request update" shows pending state without calling Shopify
- [ ] PDF download produces a readable file
- [ ] CSV download opens correctly in Excel
- [ ] QR code downloads and scans to correct URL
- [ ] Mobile: all tabs are readable on 375px width
- [ ] `npm run build` passes with 0 errors and 0 TypeScript errors
