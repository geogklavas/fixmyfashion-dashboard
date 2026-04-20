import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const dashboardUrl = process.env.DASHBOARD_URL ?? new URL(req.url).origin
  const res = NextResponse.redirect(`${dashboardUrl}/login`, { status: 303 })
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
