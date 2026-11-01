# QA Runtime scripts — FixMyFashion repair

Deterministic runtime verification scripts invoked by QA Founder Agent (`/qa-repair`), Build Agent (`/build-repair` pre-commit), or Strategist (`/strategist-repair` post-ship).

## Requirements

- **Node 20.6+** (uses built-in `--env-file` flag).
- **`.env.local`** populated in `fixmyfashion-dashboard/` (via `vercel env pull .env.local` + manual paste for Sensitive-flagged Shopify vars).
- **`@neondatabase/serverless`** — already installed (dashboard dep). Replaced `@supabase/supabase-js` on 2026-11-01; see I-R012.
- **`playwright`** — DEV-optional; install only when running `verify-dashboard-render.mjs`:
  ```
  cd fixmyfashion-dashboard
  npm install --save-dev playwright
  npx playwright install chromium
  ```

## Scripts

Run all from `fixmyfashion-dashboard/`.

### `verify-brandconfig-state.mjs`

Checks BrandConfig metaobject entry for a brand has all 11 expected fields (per I-R006 canonical list).

```
node --env-file=.env.local scripts/qa-runtime/verify-brandconfig-state.mjs --brand=becasual
node --env-file=.env.local scripts/qa-runtime/verify-brandconfig-state.mjs --brand=becasual --json
```

Exit 0 = all fields present. Exit 2 = missing fields (report lists them). Exit 1 = env / API error.

### `verify-shopify-tags.mjs`

Verifies tag hygiene on Shopify orders for a brand:
- Tag `repair-b2b-<handle>` propagates (Shopify Flow works)
- Workflow tags distributed correctly (quote-sent / in-progress / fulfilled)
- Classification tags (`job-cat-*`, `job-type-*`) applied to in-progress orders
- Removed tags NOT in use (`repair-confirmed`, `repair-received`, `repair-completed`, `repair-dispatched`, `repair-delivered`, `repair-cod`)

```
node --env-file=.env.local scripts/qa-runtime/verify-shopify-tags.mjs --brand=becasual --limit=50
```

Exit 0 = clean. Exit 2 = tag hygiene issues.

### `verify-dashboard-render.mjs`

Headless browser (Playwright) check that a URL renders without console/page errors.

```
node --env-file=.env.local scripts/qa-runtime/verify-dashboard-render.mjs --url=https://dashboard.fixmyfashion.gr/login
node --env-file=.env.local scripts/qa-runtime/verify-dashboard-render.mjs --url=https://becasual.fixmyfashion.gr
node --env-file=.env.local scripts/qa-runtime/verify-dashboard-render.mjs --url=https://dashboard.fixmyfashion.gr/dashboard/overview --session-cookie=<jwt-from-mint-magic-link>
```

For authenticated routes, first mint a session via `mint-magic-link.mjs` and pass the resulting JWT as `--session-cookie=<jwt>`.

Exit 0 = clean render. Exit 2 = HTTP error OR console/page errors.

### `mint-magic-link.mjs`

Bypasses Resend email delivery. Inserts a `magic_links` row directly into Neon Postgres, returns URL for auto-login.

```
node --env-file=.env.local scripts/qa-runtime/mint-magic-link.mjs --brand=admin        # geo.gklavas@gmail.com
node --env-file=.env.local scripts/qa-runtime/mint-magic-link.mjs --brand=becasual     # info@be-casual.gr
node --env-file=.env.local scripts/qa-runtime/mint-magic-link.mjs --json
```

Prints URL like `https://dashboard.fixmyfashion.gr/auth/verify?token=<uuid>`. 15-minute expiry. Use directly in browser OR pass through `verify-dashboard-render.mjs` for authenticated tests.

## Auth notes

- Shopify Admin API: requires **`shpat_...`** Admin API access token, NOT the `atkn_...` automation token (which returns 401 for GraphQL Admin API — see I-R### incident 2026-07-03). The production token is in Vercel as Sensitive → can't `env pull`. Fresh token requires uninstall+reinstall of the `FixMyFashion Dashboard` custom app on Shopify.
- Database: `DATABASE_URL` in `.env.local` — the Neon **pooler** connection string. Neon scales to zero when idle and resumes on the next query, so a long gap between QA runs needs no manual step.
- Dashboard admin endpoints (`/api/admin/*`): require `fmf_session` HttpOnly JWT cookie. Mint via `mint-magic-link.mjs` OR pull from browser DevTools.

## Adding new scripts

When a brief requires new verification:
1. Add script under `scripts/qa-runtime/<verb>-<subject>.mjs`.
2. Follow signature: `node --env-file=.env.local ... [--json]` args, exit codes 0/1/2, JSON output on `--json`.
3. Reference it in the brief's Test plan section.
4. Update this README with usage.
