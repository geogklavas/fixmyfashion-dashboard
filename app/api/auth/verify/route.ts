import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const dashboardUrl = process.env.DASHBOARD_URL ?? url.origin

  if (!token) {
    return NextResponse.redirect(`${dashboardUrl}/auth/verify?error=missing_token`)
  }

  const sb = supabaseAdmin()

  const { data: link, error: linkErr } = await sb
    .from('magic_links')
    .select('id, brand_handle, expires_at, used')
    .eq('token', token)
    .maybeSingle()

  if (linkErr) {
    console.error('[verify] magic_links lookup failed', linkErr)
    return NextResponse.redirect(`${dashboardUrl}/auth/verify?error=server_error`)
  }

  if (!link || link.used || new Date(link.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(`${dashboardUrl}/auth/verify?error=invalid_token`)
  }

  const { data: brand, error: brandErr } = await sb
    .from('brand_sessions')
    .select('brand_handle, brand_name, brand_email')
    .eq('brand_handle', link.brand_handle)
    .maybeSingle()

  if (brandErr || !brand) {
    console.error('[verify] brand lookup failed', brandErr)
    return NextResponse.redirect(`${dashboardUrl}/auth/verify?error=server_error`)
  }

  await sb.from('magic_links').update({ used: true }).eq('id', link.id)
  await sb
    .from('brand_sessions')
    .update({ last_login_at: new Date().toISOString() })
    .eq('brand_handle', brand.brand_handle)

  const jwt = await createSessionToken({
    brandHandle: brand.brand_handle,
    brandName: brand.brand_name,
    brandEmail: brand.brand_email,
  })

  const res = NextResponse.redirect(`${dashboardUrl}/dashboard/overview`)
  res.cookies.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
  return res
}
