import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

const TOKEN_TTL_MINUTES = 15

export async function POST(req: Request) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body', code: 'invalid_body' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'email_required', code: 'email_required' }, { status: 400 })
  }

  const sb = supabaseAdmin()
  const { data: brand, error: brandErr } = await sb
    .from('brand_sessions')
    .select('brand_handle, brand_name, brand_email')
    .ilike('brand_email', email)
    .maybeSingle()

  if (brandErr) {
    console.error('[send-link] supabase lookup failed', brandErr)
    return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })
  }

  if (!brand) {
    return NextResponse.json({ error: 'email_not_found', code: 'email_not_found' }, { status: 404 })
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString()

  const { error: insertErr } = await sb.from('magic_links').insert({
    brand_handle: brand.brand_handle,
    token,
    expires_at: expiresAt,
    used: false,
  })

  if (insertErr) {
    console.error('[send-link] magic_links insert failed', insertErr)
    return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })
  }

  const dashboardUrl = process.env.DASHBOARD_URL ?? 'http://localhost:3000'
  const link = `${dashboardUrl}/api/auth/verify?token=${token}`

  const resendKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL ?? 'FixMyFashion <dashboard@fixmyfashion.gr>'

  if (!resendKey) {
    console.error('[send-link] RESEND_API_KEY not set')
    return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })
  }

  const resend = new Resend(resendKey)
  const { error: sendErr } = await resend.emails.send({
    from,
    to: brand.brand_email,
    subject: 'Your FixMyFashion dashboard link',
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#1a1a1a">
        <h1 style="font-size:20px;margin:0 0 16px">Hi ${brand.brand_name},</h1>
        <p style="font-size:15px;line-height:1.5;margin:0 0 24px">
          Click below to sign in to your FixMyFashion dashboard. This link expires in 15 minutes.
        </p>
        <p style="margin:0 0 24px">
          <a href="${link}" style="display:inline-block;background:#0F6E56;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:500">
            Open dashboard
          </a>
        </p>
        <p style="font-size:13px;color:#6b7280;margin:0">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  })

  if (sendErr) {
    console.error('[send-link] resend send failed', sendErr)
    return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
