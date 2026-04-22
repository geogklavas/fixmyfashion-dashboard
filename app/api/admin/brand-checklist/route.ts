import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

// Admin-only: update brand_sessions launch checklist booleans + next_review_date
// for a given brand_handle. Used by the admin launch checklist editor UI.
export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'admin_only' }, { status: 403 })
  }

  let body: {
    brandHandle?: string
    footerDone?: boolean
    emailDone?: boolean
    packagingDone?: boolean
    nextReviewDate?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  if (!body.brandHandle || typeof body.brandHandle !== 'string') {
    return NextResponse.json({ error: 'brandHandle_required' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (typeof body.footerDone === 'boolean') update.launch_footer_done = body.footerDone
  if (typeof body.emailDone === 'boolean') update.launch_email_done = body.emailDone
  if (typeof body.packagingDone === 'boolean') update.launch_packaging_done = body.packagingDone
  if (body.nextReviewDate === null) update.next_review_date = null
  else if (typeof body.nextReviewDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.nextReviewDate)) {
    update.next_review_date = body.nextReviewDate
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 })
  }

  const { error } = await supabaseAdmin().from('brand_sessions').update(update).eq('brand_handle', body.brandHandle)
  if (error) {
    console.error('[brand-checklist] update failed', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
