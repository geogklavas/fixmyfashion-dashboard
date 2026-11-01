import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

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

  // This is a partial update of 1–4 optional fields, and it is the only place
  // in the codebase where the SET clause depends on the request body. Rather
  // than assemble SQL from input, every column is written unconditionally with
  // a parameter that means "leave it alone" when the caller omitted it:
  //   - the three booleans use coalesce(param, current_value), so null = no change
  //   - next_review_date cannot use coalesce, because null is a MEANINGFUL value
  //     ("clear the date"). It gets a separate boolean flag instead.
  // The statement is therefore fully static; only values vary.
  const footer = typeof body.footerDone === 'boolean' ? body.footerDone : null
  const email = typeof body.emailDone === 'boolean' ? body.emailDone : null
  const packaging = typeof body.packagingDone === 'boolean' ? body.packagingDone : null

  let touchDate = false
  let dateValue: string | null = null
  if (body.nextReviewDate === null) {
    touchDate = true
  } else if (typeof body.nextReviewDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.nextReviewDate)) {
    touchDate = true
    dateValue = body.nextReviewDate
  }

  if (footer === null && email === null && packaging === null && !touchDate) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 })
  }

  try {
    const rows = await db()`
      update brand_sessions set
        launch_footer_done    = coalesce(${footer}::boolean, launch_footer_done),
        launch_email_done     = coalesce(${email}::boolean, launch_email_done),
        launch_packaging_done = coalesce(${packaging}::boolean, launch_packaging_done),
        next_review_date      = case when ${touchDate}::boolean
                                     then ${dateValue}::date
                                     else next_review_date end
      where brand_handle = ${body.brandHandle}
      returning brand_handle`
    if (rows.length === 0) {
      return NextResponse.json({ error: 'brand_not_found' }, { status: 404 })
    }
  } catch (err) {
    console.error('[brand-checklist] update failed', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
