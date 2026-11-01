import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  ADMIN_RETURN_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  getSession,
} from '@/lib/auth'
import { db, first } from '@/lib/db'

export const runtime = 'nodejs'

// POST { brandHandle } — admin only.
// 1. Stash the admin's current token in fmf_admin_return cookie.
// 2. Issue a new fmf_session for the target brand with impersonating: true.
// 3. Return { redirect: '/dashboard/overview' } so the client can navigate.
export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'admin_only' }, { status: 403 })
  }

  let body: { brandHandle?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  if (!body.brandHandle) {
    return NextResponse.json({ error: 'brandHandle_required' }, { status: 400 })
  }

  type BrandRow = { brand_handle: string; brand_name: string; brand_email: string; role: string | null }
  let target: BrandRow | undefined
  try {
    target = first<BrandRow>(
      await db()`select brand_handle, brand_name, brand_email, role
                 from brand_sessions where brand_handle = ${body.brandHandle} limit 1`,
    )
  } catch (err) {
    console.error('[impersonate] brand lookup failed', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (!target) return NextResponse.json({ error: 'brand_not_found' }, { status: 404 })

  if (target.role === 'admin') {
    return NextResponse.json({ error: 'cannot_impersonate_admin' }, { status: 400 })
  }

  const store = await cookies()
  const currentToken = store.get(SESSION_COOKIE)?.value
  if (!currentToken) {
    return NextResponse.json({ error: 'no_current_session' }, { status: 401 })
  }

  const impersonatingToken = await createSessionToken({
    brandHandle: target.brand_handle,
    brandName: target.brand_name,
    brandEmail: target.brand_email,
    role: 'brand',
    impersonating: true,
  })

  const res = NextResponse.json({ success: true, redirect: '/dashboard/overview' })
  // Stash admin token so we can pop back
  res.cookies.set(ADMIN_RETURN_COOKIE, currentToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1 hour to exit
  })
  res.cookies.set(SESSION_COOKIE, impersonatingToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
  return res
}
