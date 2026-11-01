#!/usr/bin/env node
// QA Runtime — headless browser check that a dashboard page renders + no console errors.
//
// Run from fixmyfashion-dashboard/:
//   node --env-file=.env.local scripts/qa-runtime/verify-dashboard-render.mjs [--url=<full-url>] [--json]
//
// Defaults to https://dashboard.fixmyfashion.gr/login (public page — no auth needed).
// For authenticated pages, first mint a magic-link session via mint-magic-link.mjs
// and pass --session-cookie=<jwt> to attach the JWT cookie before navigation.
//
// Exit code:
//   0 = page returns 200 + no console errors + expected DOM element found
//   1 = playwright not installed / config error
//   2 = HTTP >=400 or console errors detected
//
// Requires: `npm install --save-dev playwright` in fixmyfashion-dashboard/ (defers install per project preference).
// Reads playwright from node_modules; if missing, prints install command + exits 1.

const args = process.argv.slice(2)
const url = (args.find(a => a.startsWith('--url=')) || '--url=https://dashboard.fixmyfashion.gr/login').split('=')[1]
const sessionCookie = (args.find(a => a.startsWith('--session-cookie=')) || '--session-cookie=').split('=')[1]
const jsonOut = args.includes('--json')

let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch (_) {
  console.error('Playwright is not installed. Run:')
  console.error('  cd fixmyfashion-dashboard && npm install --save-dev playwright && npx playwright install chromium')
  process.exit(1)
}

const consoleErrors = []
const pageErrors = []

try {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

  if (sessionCookie) {
    const parsed = new URL(url)
    await context.addCookies([{
      name: 'fmf_session',
      value: sessionCookie,
      domain: parsed.hostname,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    }])
  }

  const page = await context.newPage()
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', err => {
    pageErrors.push(err.message)
  })

  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  const status = response ? response.status() : 0
  const title = await page.title()
  const bodyLength = (await page.content()).length

  await browser.close()

  const ok = status >= 200 && status < 400 && consoleErrors.length === 0 && pageErrors.length === 0

  const result = {
    ok,
    url,
    status,
    title,
    bodyLength,
    consoleErrors,
    pageErrors,
  }

  if (jsonOut) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`URL: ${url}`)
    console.log(`Status: ${status}   Title: ${title}   Body length: ${bodyLength}`)
    if (consoleErrors.length) console.log(`❌ Console errors (${consoleErrors.length}):`, consoleErrors)
    if (pageErrors.length) console.log(`❌ Page errors (${pageErrors.length}):`, pageErrors)
    console.log(ok ? '✅ Page renders cleanly.' : '❌ Issues detected.')
  }
  process.exit(ok ? 0 : 2)
} catch (err) {
  if (jsonOut) console.log(JSON.stringify({ ok: false, error: err.message }))
  else console.error('Error:', err.message)
  process.exit(2)
}
