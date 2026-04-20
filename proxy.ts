import { NextResponse, type NextRequest } from 'next/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth'

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')
  if (isAdminRoute && session.role !== 'admin') {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard/overview'
    url.search = ''
    return NextResponse.redirect(url)
  }

  const res = NextResponse.next()
  res.headers.set('x-brand-handle', session.brandHandle)
  res.headers.set('x-brand-name', session.brandName)
  res.headers.set('x-brand-email', session.brandEmail)
  res.headers.set('x-role', session.role ?? 'brand')
  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
