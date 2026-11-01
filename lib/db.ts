import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

/**
 * Postgres access for the dashboard, over Neon's HTTP driver.
 *
 * Replaced Supabase on 2026-11-01. The Supabase free tier paused the project
 * after ~1 week of inactivity and then refused to resume it (I-R012); this
 * project is dormant for months at a time, so a database needing a human to
 * wake it was the wrong tool. Neon scales to zero and resumes on the next
 * query. Schema lives in `db/schema.sql`.
 *
 * Usage — tagged template only, so every value is parameterised:
 *
 *   const rows = await db()`select * from brand_sessions where brand_handle = ${handle}`
 *
 * Never build a query by concatenating strings. The tag is the safety barrier.
 *
 * Errors THROW here. Supabase returned `{ data, error }` tuples, so any caller
 * that wants to degrade gracefully needs its own try/catch — see
 * `lib/launch-checklist.ts`.
 */
let cached: NeonQueryFunction<false, false> | null = null

export function db(): NeonQueryFunction<false, false> {
  if (cached) return cached
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL missing')
  cached = neon(url)
  return cached
}

/** First row, or undefined. Replaces supabase-js `.maybeSingle()`. */
export function first<T>(rows: Record<string, unknown>[]): T | undefined {
  return rows[0] as T | undefined
}
