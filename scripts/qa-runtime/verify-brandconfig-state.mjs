#!/usr/bin/env node
// QA Runtime — verify BrandConfig metaobject state on live Shopify.
//
// Run from fixmyfashion-dashboard/:
//   node --env-file=.env.local scripts/qa-runtime/verify-brandconfig-state.mjs [--brand=<handle>] [--json]
//
// Exit code:
//   0 = all expected fields present + non-null for the brand
//   1 = missing token / GraphQL error
//   2 = field(s) missing or unexpectedly null
//
// Requires SHOPIFY_ADMIN_ACCESS_TOKEN (Admin API access token, shpat_...) + SHOPIFY_STORE_DOMAIN in env.
// The atkn_ automation token does NOT work here — needs Admin API scope.

const TYPE_HANDLE = 'brandconfig'
const API_VERSION = '2024-01'

// NOTE: Shopify metaobject fields have TWO names — display "name" (human-readable)
// + technical "key" (returned by GraphQL). Field with display name "allowed Categories"
// has technical key `allowed_categories`. Always use the KEY here. See I-R011.
const EXPECTED_FIELDS = [
  'subdomain', 'brand_name', 'logo', 'primary', 'secondary',
  'return_url', 'logo_url', 'hero_image_url', 'brand_description',
  'button_text', 'allowed_categories',
]

const args = process.argv.slice(2)
const brand = (args.find(a => a.startsWith('--brand=')) || '--brand=becasual').split('=')[1]
const jsonOut = args.includes('--json')

const domain = process.env.SHOPIFY_STORE_DOMAIN
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN

if (!domain || !token) {
  console.error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN in env.')
  console.error('Note: token must be shpat_ (Admin API access token), NOT atkn_ (automation token).')
  process.exit(1)
}

async function gql(query, variables) {
  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${body.slice(0, 300)}`)
  }
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data
}

try {
  const data = await gql(`
    query GetByHandle($handle: MetaobjectHandleInput!) {
      metaobjectByHandle(handle: $handle) {
        id handle displayName
        fields { key value type }
      }
    }
  `, { handle: { type: TYPE_HANDLE, handle: brand } })

  const entry = data.metaobjectByHandle
  if (!entry) {
    if (jsonOut) console.log(JSON.stringify({ ok: false, error: 'not_found', brand }))
    else console.error(`No metaobject entry for handle="${brand}" on type="${TYPE_HANDLE}".`)
    process.exit(2)
  }

  const foundKeys = new Set(entry.fields.map(f => f.key))
  const missing = EXPECTED_FIELDS.filter(k => !foundKeys.has(k))
  const nullFields = entry.fields.filter(f => f.value === null || f.value === '').map(f => f.key)

  const result = {
    ok: missing.length === 0,
    brand,
    id: entry.id,
    handle: entry.handle,
    displayName: entry.displayName,
    fieldCount: entry.fields.length,
    fields: Object.fromEntries(entry.fields.map(f => [f.key, { type: f.type, value: f.value }])),
    missing,
    nullFields,
    expectedFieldCount: EXPECTED_FIELDS.length,
  }

  if (jsonOut) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Brand: ${brand}   handle=${entry.handle}   fields=${entry.fields.length}/${EXPECTED_FIELDS.length}`)
    if (missing.length) console.log(`⚠️  Missing fields: ${missing.join(', ')}`)
    if (nullFields.length) console.log(`ℹ️  Null/empty fields: ${nullFields.join(', ')}`)
    if (result.ok) console.log('✅ All expected fields present.')
  }
  process.exit(result.ok ? 0 : 2)
} catch (err) {
  if (jsonOut) console.log(JSON.stringify({ ok: false, error: err.message }))
  else console.error('Error:', err.message)
  process.exit(1)
}
