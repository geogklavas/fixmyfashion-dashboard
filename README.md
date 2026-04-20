# FixMyFashion — Brand Admin Dashboard

Login-protected web app where each FixMyFashion brand partner sees their repair service performance.

**Live:** `dashboard.fixmyfashion.gr` *(once deployed)*

---

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Auth: Resend magic link + JWT (jose) in HttpOnly cookie
- Auth/session state: Supabase (Postgres)
- Data: Shopify Admin GraphQL API (with deterministic mock fallback for local dev)
- Charts: Recharts · PDF: jsPDF · QR: qrcode
- Hosting: Vercel

---

## Local dev

```bash
npm install
cp .env.example .env.local   # then fill values
npm run dev                  # http://localhost:3000
```

If `SHOPIFY_ADMIN_ACCESS_TOKEN` is missing, the app uses mock repair data so the full UI is viewable.

---

## Environment variables

| Key | Where from | Purpose |
|-----|-----------|---------|
| `SHOPIFY_STORE_DOMAIN` | e.g. `fixmyfashion.myshopify.com` | Admin API host |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Shopify custom app | GraphQL auth (`shpat_…`) |
| `JWT_SECRET` | generate a long random string | signs session cookies |
| `RESEND_API_KEY` | resend.com | sends magic-link emails |
| `RESEND_FROM_EMAIL` | e.g. `FixMyFashion <dashboard@fixmyfashion.gr>` | email `From:` header |
| `DASHBOARD_URL` | `http://localhost:3000` / prod URL | base for magic-link URLs |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Data API | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → Secret | server-only; bypasses RLS |

---

## Supabase schema

Run once in the SQL editor (pick "Run and enable RLS" — the app uses the service_role key which bypasses RLS):

```sql
CREATE TABLE brand_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_handle text NOT NULL UNIQUE,
  brand_name text NOT NULL,
  brand_email text NOT NULL UNIQUE,
  role text DEFAULT 'brand',
  magic_token text,
  token_expires_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now()
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

CREATE INDEX idx_magic_links_token ON magic_links(token);
CREATE INDEX idx_brand_sessions_email ON brand_sessions(lower(brand_email));
```

### Add a brand
```sql
INSERT INTO brand_sessions (brand_handle, brand_name, brand_email)
VALUES ('becasual', 'be-casual', 'info@be-casual.gr');
```

### Promote a user to superadmin
```sql
UPDATE brand_sessions SET role = 'admin' WHERE brand_email = 'you@fixmyfashion.gr';
```
Admin users are redirected to `/admin` after login instead of `/dashboard/overview`.

---

## Routes

| Path | Role | What |
|------|------|------|
| `/login` | public | request magic link |
| `/auth/verify` | public | error page for expired/used tokens |
| `/api/auth/{send-link,verify,logout}` | public | auth API |
| `/dashboard/overview` | brand | KPIs + pipeline + charts |
| `/dashboard/sustainability` | brand | impact + downloadable badge |
| `/dashboard/log` | brand | filterable repair table |
| `/dashboard/analytics` | brand | donut, turnaround, stacked monthly, product insights |
| `/dashboard/map` | brand | Greece map + region % + pickup method |
| `/dashboard/reports` | brand | PDF + CSV downloads |
| `/dashboard/settings` | brand | portal URL + QR + category requests + support |
| `/admin` | admin | all brands + pending category change requests |

---

## Deploy to Vercel

1. Import the GitHub repo at https://vercel.com/new.
2. Add all env vars above in **Project → Settings → Environment Variables** (Production + Preview).
3. `DASHBOARD_URL` must match the public URL (e.g. `https://dashboard.fixmyfashion.gr`).
4. Connect custom domain `dashboard.fixmyfashion.gr`; point a CNAME at Papaki → `cname.vercel-dns.com`.
5. Before first real-brand use: verify your Resend domain (`fixmyfashion.gr`) and swap `RESEND_FROM_EMAIL` off `onboarding@resend.dev`.

---

## Project layout

```
app/
  login/              magic-link request
  auth/verify/        error display
  admin/              superadmin view
  dashboard/          brand-facing tabs (layout.tsx shared)
  api/auth/*          send-link, verify, logout
  api/settings/*      category-change POST
components/
  dashboard/          Header, TabNav, tables, badges
  charts/             Recharts wrappers
  ui/                 KpiCard, ComingSoon
lib/
  auth.ts             JWT sign/verify (jose)
  supabase.ts         service-role client
  shopify.ts          Admin GraphQL client + types
  data.ts             cached data layer + all aggregations
  mock.ts             deterministic fallback orders
  tokens.ts           design tokens + helpers
proxy.ts              route protection (Next.js 16 proxy convention)
```

---

## Data model decisions

- **Real-time, no cache (Stage 1):** every dashboard request hits Shopify. React `cache()` dedupes within a single render.
- **Per-brand isolation:** JWT carries `brandHandle`; every server query filters by tag `repair-b2b-{handle}`.
- **Category changes are proposals, not writes:** Settings tab inserts into `category_change_requests`; admins apply them in Shopify BrandConfig manually.
- **Mock fallback:** missing Shopify env → `lib/mock.ts` seeds 60 deterministic orders so local dev + demos work offline.

---

## Useful scripts

```bash
npm run dev      # dev server
npm run build    # production build + typecheck
npm start        # run the build
npm run lint
```
