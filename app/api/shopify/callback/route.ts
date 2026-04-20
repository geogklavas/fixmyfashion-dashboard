import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

function verifyHmac(url: URL, secret: string): boolean {
  const hmac = url.searchParams.get('hmac')
  if (!hmac) return false

  const params: [string, string][] = []
  url.searchParams.forEach((v, k) => {
    if (k !== 'hmac' && k !== 'signature') params.push([k, v])
  })
  params.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const message = params.map(([k, v]) => `${k}=${v}`).join('&')

  const computed = createHmac('sha256', secret).update(message).digest('hex')
  const a = Buffer.from(hmac, 'hex')
  const b = Buffer.from(computed, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const shop = url.searchParams.get('shop')
  const state = url.searchParams.get('state')

  const apiKey = process.env.SHOPIFY_API_KEY
  const apiSecret = process.env.SHOPIFY_API_SECRET
  if (!apiKey || !apiSecret) {
    return htmlError('Server missing SHOPIFY_API_KEY or SHOPIFY_API_SECRET')
  }
  if (!code || !shop) return htmlError('Missing code or shop')

  // Validate shop domain shape
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
    return htmlError('Invalid shop domain')
  }

  // State (CSRF) check
  const store = await cookies()
  const expected = store.get('shopify_oauth_state')?.value
  if (!expected || expected !== state) {
    return htmlError('Invalid OAuth state — start the install again.')
  }

  // HMAC check
  if (!verifyHmac(url, apiSecret)) {
    return htmlError('HMAC validation failed')
  }

  // Exchange code for access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: apiSecret,
      code,
    }),
    cache: 'no-store',
  })

  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    console.error('[shopify.callback] token exchange failed', tokenRes.status, text)
    return htmlError(`Token exchange failed: ${tokenRes.status}`)
  }

  const body = (await tokenRes.json()) as { access_token?: string; scope?: string }
  const token = body.access_token
  if (!token) return htmlError('No access_token in response')

  // Show token to admin; they copy it into Vercel env var
  return new NextResponse(htmlSuccess(shop, token, body.scope ?? ''), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function htmlPage(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:680px;margin:48px auto;padding:0 24px;color:#1a1a1a;line-height:1.5}
    h1{font-size:20px;margin:0 0 8px}
    code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:13px}
    pre{background:#f3f4f6;padding:16px;border-radius:8px;overflow:auto;font-size:13px;word-break:break-all;white-space:pre-wrap}
    .box{border:1px solid rgba(0,0,0,0.1);border-radius:12px;padding:20px;margin:16px 0}
    .ok{background:#E1F5EE;border-color:#5DCAA5}
    .err{background:#FAEEDA;border-color:#BA7517;color:#BA7517}
    ol li{margin:6px 0}
    a{color:#0F6E56}
  </style></head><body>${body}</body></html>`
}

function htmlSuccess(shop: string, token: string, scope: string): string {
  return htmlPage(
    'Shopify install complete',
    `<h1>✅ Shopify install complete</h1>
    <p>Connected to <code>${shop}</code> with scopes: <code>${scope}</code></p>
    <div class="box ok">
      <strong>Your Admin API access token (copy this):</strong>
      <pre>${token}</pre>
    </div>
    <ol>
      <li>Go to Vercel → Project Settings → Environment Variables</li>
      <li>Find <code>SHOPIFY_ADMIN_ACCESS_TOKEN</code> (or add it) and paste the token above</li>
      <li>Also ensure <code>SHOPIFY_STORE_DOMAIN</code> = <code>${shop}</code></li>
      <li>Redeploy the latest deployment</li>
    </ol>
    <p>Once redeployed, the dashboard will switch from demo data to live Shopify orders.</p>
    <p><a href="/admin">← Back to admin</a></p>`,
  )
}

function htmlError(msg: string): NextResponse {
  return new NextResponse(
    htmlPage('Install error', `<h1>Install error</h1><div class="box err">${msg}</div><p><a href="/admin">← Back to admin</a></p>`),
    { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}
