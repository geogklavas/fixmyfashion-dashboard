import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  let body: { categories?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body', code: 'invalid_body' }, { status: 400 })
  }

  const categories = (body.categories ?? []).filter((c) => typeof c === 'string' && c.trim().length > 0)
  if (categories.length === 0) {
    return NextResponse.json({ error: 'empty_categories', code: 'empty_categories' }, { status: 400 })
  }

  const { error } = await supabaseAdmin().from('category_change_requests').insert({
    brand_handle: session.brandHandle,
    requested_categories: categories.join(', '),
    status: 'pending',
  })

  if (error) {
    console.error('[settings.categories] insert failed', error)
    return NextResponse.json({ error: 'server_error', code: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
