import { supabaseAdmin } from './supabase'

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
// Returns defaults (all false, no date) if the Supabase columns don't exist
// yet — keeps the dashboard running before the migration is applied.
export async function getLaunchChecklist(brandHandle: string): Promise<LaunchChecklist> {
  try {
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from('brand_sessions')
      .select('launch_footer_done, launch_email_done, launch_packaging_done, next_review_date')
      .eq('brand_handle', brandHandle)
      .maybeSingle()
    if (error || !data) return DEFAULT
    const row = data as {
      launch_footer_done?: boolean | null
      launch_email_done?: boolean | null
      launch_packaging_done?: boolean | null
      next_review_date?: string | null
    }
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
