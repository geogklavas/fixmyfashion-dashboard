#!/usr/bin/env node
// QA Runtime — mint a magic-link token directly in the database for auto-login.
// Bypasses Resend email delivery; returns URL for Playwright to navigate.
//
// Run from fixmyfashion-dashboard/:
//   node --env-file=.env.local scripts/qa-runtime/mint-magic-link.mjs [--brand=<handle>] [--json]
//
// Exit code:
//   0 = token minted, URL printed
//   1 = missing DATABASE_URL, or a query failed
//   2 = brand_sessions row not found for that handle
//
// Defaults to admin (--brand=admin → geo.gklavas@gmail.com).
// The magic-link URL includes a 15-minute expiry.

import { neon } from '@neondatabase/serverless'
import { randomUUID } from 'node:crypto'

const args = process.argv.slice(2)
const brandHandle = (args.find(a => a.startsWith('--brand=')) || '--brand=admin').split('=')[1]
const jsonOut = args.includes('--json')

const databaseUrl = process.env.DATABASE_URL
const dashboardUrl = process.env.DASHBOARD_URL || 'https://dashboard.fixmyfashion.gr'

if (!databaseUrl) {
  console.error('Missing DATABASE_URL in env.')
  process.exit(1)
}

const sql = neon(databaseUrl)

try {
  const [session] = await sql`
    select brand_handle, brand_email
    from brand_sessions where brand_handle = ${brandHandle} limit 1`
  if (!session) {
    if (jsonOut) console.log(JSON.stringify({ ok: false, error: 'brand_not_found', brandHandle }))
    else console.error(`No brand_sessions row for brand_handle=${brandHandle}.`)
    process.exit(2)
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  await sql`
    insert into magic_links (brand_handle, token, expires_at, used)
    values (${brandHandle}, ${token}, ${expiresAt}, false)`

  const url = `${dashboardUrl}/api/auth/verify?token=${token}`

  if (jsonOut) {
    console.log(JSON.stringify({ ok: true, brandHandle, brandEmail: session.brand_email, url, expiresAt }))
  } else {
    console.log(`Brand handle: ${brandHandle}`)
    console.log(`Brand email:  ${session.brand_email}`)
    console.log(`Expires at:   ${expiresAt}`)
    console.log(`Magic URL:    ${url}`)
    console.log(`\nUse this URL with verify-dashboard-render.mjs OR paste in browser to log in.`)
  }
  process.exit(0)
} catch (err) {
  if (jsonOut) console.log(JSON.stringify({ ok: false, error: err.message }))
  else console.error('Error:', err.message)
  process.exit(1)
}
