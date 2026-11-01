import { db, first } from './db'

export type LaunchChecklist = {
  footerDone: boolean
  emailDone: boolean
  packagingDone: boolean
  nextReviewDate: string | null
}

const DEFAULT: LaunchChecklist = {
  footerDone: false,
  emailDone: false,
  packagingDone: false,
  nextReviewDate: null,
}

// Reads the launch checklist + next review date for a brand.
// Returns defaults (all false, no date) on ANY failure — unreachable database,
// missing row, missing columns. This banner is decorative; it must never be the
// reason a dashboard tab 500s. The try/catch matters more since the move to
// Neon (2026-11-01): the Neon driver throws, where supabase-js returned an
// `{ error }` tuple that fell through to the same default.
export async function getLaunchChecklist(brandHandle: string): Promise<LaunchChecklist> {
  try {
    type Row = {
      launch_footer_done?: boolean | null
      launch_email_done?: boolean | null
      launch_packaging_done?: boolean | null
      next_review_date?: string | null
    }
    const row = first<Row>(
      await db()`select launch_footer_done, launch_email_done,
                        launch_packaging_done, next_review_date
                 from brand_sessions where brand_handle = ${brandHandle} limit 1`,
    )
    if (!row) return DEFAULT
    return {
      footerDone: !!row.launch_footer_done,
      emailDone: !!row.launch_email_done,
      packagingDone: !!row.launch_packaging_done,
      nextReviewDate: row.next_review_date ?? null,
    }
  } catch (err) {
    console.error('[launch-checklist] failed to read, returning defaults', err)
    return DEFAULT
  }
}

export function isLaunchComplete(c: LaunchChecklist): boolean {
  return c.footerDone && c.emailDone && c.packagingDone
}
