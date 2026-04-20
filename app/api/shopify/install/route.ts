import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'

const SCOPES = [
  'read_orders',
  'read_all_orders',
  'read_products',
  'read_metaobjects',
  'read_customers',
  'read_fulfillments',
]

export async function GET(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'admin_only' }, { status: 403 })
  }

  const url = new URL(req.url)
  const rawShop = url.searchParams.get('shop') ?? 'fixmyfashion'
  const shop = rawShop.endsWith('.myshopify.com') ? rawShop : `${rawShop}.myshopify.com`

  const apiKey = process.env.SHOPIFY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'SHOPIFY_API_KEY_missing' }, { status: 500 })
  }

  const state = randomBytes(16).toString('hex')
  const dashboardUrl = (process.env.DASHBOARD_URL ?? url.origin).trim().replace(/\/+$/, '')
  const redirectUri = `${dashboardUrl}/api/shopify/callback`

  const authorizeUrl = new URL(`https://${shop}/admin/oauth/authorize`)
  authorizeUrl.searchParams.set('client_id', apiKey)
  authorizeUrl.searchParams.set('scope', SCOPES.join(','))
  authorizeUrl.searchParams.set('redirect_uri', redirectUri)
  authorizeUrl.searchParams.set('state', state)

  const res = NextResponse.redirect(authorizeUrl.toString())
  res.cookies.set('shopify_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}
