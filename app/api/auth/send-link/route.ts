import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'
import { db, first } from '@/lib/db'

export const runtime = 'nodejs'

const TOKEN_TTL_MINUTES = 15
const MAX_PER_EMAIL_PER_HOUR = 3
const MAX_PER_IP_PER_HOUR = 10

// Floors every generic-success response at this duration so a matched (Resend
// call, ~2.4s observed) and unmatched (no-op) request take comparably long —
// the only other signal (status/body) is already identical. See F1,
// strategy/SECURITY_REVIEW_2026_11.md.
const MIN_RESPONSE_MS = 1500

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Vercel's edge appends the real client IP as the last x-forwarded-for entry;
// anything to its left can be set by the client. x-real-ip, when present, is
// Vercel's own value and is preferred.
function getClientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const parts = forwardedFor.split(',').map((p) => p.trim())
    return parts[parts.length - 1] || 'unknown'
  }
  return 'unknown'
}

export async function POST(req: Request) {
  const started = Date.now()

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

  const ip = getClientIp(req)
  const sql = db()

  try {
    await sql`insert into login_attempts (email, ip) values (${email}, ${ip})`

    const emailCount = first<{ count: number }>(
      await sql`select count(*)::int as count from login_attempts
                where email = ${email} and created_at > now() - interval '1 hour'`,
    )
    const ipCount = first<{ count: number }>(
      await sql`select count(*)::int as count from login_attempts
                where ip = ${ip} and created_at > now() - interval '1 hour'`,
    )

    if ((emailCount?.count ?? 0) > MAX_PER_EMAIL_PER_HOUR || (ipCount?.count ?? 0) > MAX_PER_IP_PER_HOUR) {
      return NextResponse.json({ error: 'rate_limited', code: 'rate_limited' }, { status: 429 })
    }
  } catch (err) {
    console.error('[send-link] rate-limit bookkeeping failed', err)
    return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })
  }

  // Exact case-insensitive match. The old code used supabase `.ilike()` with no
  // wildcards, which is an equality test — NOT a pattern match. Translating it to
  // SQL `ILIKE` would make `_` and `%` in user input significant, so compare
  // lower() to lower() instead. Index: brand_sessions_email_lower_idx.
  type BrandRow = { brand_handle: string; brand_name: string; brand_email: string }
  let brand: BrandRow | undefined
  try {
    brand = first<BrandRow>(
      await sql`select brand_handle, brand_name, brand_email
                from brand_sessions
                where lower(brand_email) = lower(${email}) limit 1`,
    )
  } catch (err) {
    console.error('[send-link] brand lookup failed', err)
    return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })
  }

  // Deliberately NOT branching on `!brand` here with an early, distinctly-shaped
  // response — that status/body/timing difference is exactly the enumeration
  // oracle this brief closes (F1). Every path below converges on the same
  // `{ ok: true }` 200, padded to MIN_RESPONSE_MS.
  if (brand) {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString()

    try {
      await sql`insert into magic_links (brand_handle, token, expires_at, used)
                values (${brand.brand_handle}, ${token}, ${expiresAt}, false)`
    } catch (err) {
      console.error('[send-link] magic_links insert failed', err)
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
  }

  const elapsed = Date.now() - started
  if (elapsed < MIN_RESPONSE_MS) {
    await sleep(MIN_RESPONSE_MS - elapsed)
  }

  return NextResponse.json({ ok: true })
}
