import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  ADMIN_RETURN_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from '@/lib/auth'

export const runtime = 'nodejs'

// POST — restore the stashed admin session. Anyone with the cookie can hit this
// (it just swaps cookies back; if no admin cookie present, nothing happens).
export async function POST() {
  const store = await cookies()
  const stashed = store.get(ADMIN_RETURN_COOKIE)?.value

  if (!stashed) {
    return NextResponse.json({ error: 'no_stashed_session' }, { status: 400 })
  }

  // Verify the stashed token is still valid before swapping.
  const verified = await verifySessionToken(stashed)
  if (!verified) {
    const res = NextResponse.json({ error: 'stashed_session_expired' }, { status: 401 })
    res.cookies.delete(ADMIN_RETURN_COOKIE)
    return res
  }

  const res = NextResponse.json({ success: true, redirect: '/admin' })
  res.cookies.set(SESSION_COOKIE, stashed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
  res.cookies.delete(ADMIN_RETURN_COOKIE)
  return res
}
