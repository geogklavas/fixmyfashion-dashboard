import { NextResponse } from 'next/server'
import { db, first } from '@/lib/db'
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const dashboardUrl = process.env.DASHBOARD_URL ?? url.origin

  if (!token) {
    return NextResponse.redirect(`${dashboardUrl}/auth/verify?error=missing_token`)
  }

  const sql = db()

  type ClaimRow = { brand_handle: string }
  type BrandRow = { brand_handle: string; brand_name: string; brand_email: string; role: string | null }

  let claim: ClaimRow | undefined
  let brand: BrandRow | undefined

  // Claim the token atomically: validity check and single-use marking happen in
  // one statement, so a token can never be redeemed twice — not by a replay and
  // not by two concurrent requests. Expiry is evaluated by the database clock.
  // No row back = missing, already used, or expired; all three are invalid_token,
  // which is what the previous read-then-write version reported anyway.
  try {
    claim = first<ClaimRow>(
      await sql`update magic_links
                set used = true
                where token = ${token} and used = false and expires_at > now()
                returning brand_handle`,
    )
  } catch (err) {
    console.error('[verify] magic_links claim failed', err)
    return NextResponse.redirect(`${dashboardUrl}/auth/verify?error=server_error`)
  }

  if (!claim) {
    return NextResponse.redirect(`${dashboardUrl}/auth/verify?error=invalid_token`)
  }

  try {
    brand = first<BrandRow>(
      await sql`select brand_handle, brand_name, brand_email, role
                from brand_sessions where brand_handle = ${claim.brand_handle} limit 1`,
    )
  } catch (err) {
    console.error('[verify] brand lookup failed', err)
    return NextResponse.redirect(`${dashboardUrl}/auth/verify?error=server_error`)
  }

  if (!brand) {
    console.error('[verify] no brand_sessions row for', claim.brand_handle)
    return NextResponse.redirect(`${dashboardUrl}/auth/verify?error=server_error`)
  }

  // Cosmetic — drives the "Last login" column in /admin. Never block sign-in on it.
  try {
    await sql`update brand_sessions set last_login_at = now() where brand_handle = ${brand.brand_handle}`
  } catch (err) {
    console.error('[verify] last_login_at stamp failed', err)
  }

  const role = brand.role === 'admin' ? 'admin' : 'brand'
  const jwt = await createSessionToken({
    brandHandle: brand.brand_handle,
    brandName: brand.brand_name,
    brandEmail: brand.brand_email,
    role,
  })

  const landing = role === 'admin' ? '/admin' : '/dashboard/overview'
  const res = NextResponse.redirect(`${dashboardUrl}${landing}`)
  res.cookies.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
  return res
}
