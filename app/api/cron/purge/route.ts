import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Weekly GDPR retention job (Sprint 7 item S7-M1).
 *
 * Deletes spent and expired magic links older than 30 days by calling
 * `purge_old_magic_links()`, defined in `db/schema.sql`. Magic links are not
 * customer PII, but there is no reason to keep them, and "we delete what we no
 * longer need" is easier to state to a brand partner than to argue around.
 *
 * Scheduled by `vercel.json`. Vercel sends `Authorization: Bearer $CRON_SECRET`
 * on cron invocations; without a matching secret this route is a no-op 401, so
 * it is safe even though the path is public.
 *
 * NOTE: this does NOT exist to keep the database awake. Neon resumes on query.
 * The Supabase setup it replaced needed a daily keep-alive for exactly that
 * reason — see I-R012.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/purge] CRON_SECRET not set — refusing to run')
    return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const rows = await db()`select purge_old_magic_links() as purged`
    const purged = Number((rows[0] as { purged: number } | undefined)?.purged ?? 0)
    console.log(`[cron/purge] deleted ${purged} magic_links row(s)`)
    return NextResponse.json({ ok: true, purged })
  } catch (err) {
    // Fail loudly. A silent failure here means retention quietly stops working
    // and nobody notices until someone asks for the policy in writing.
    console.error('[cron/purge] failed', err)
    return NextResponse.json({ error: 'purge_failed' }, { status: 500 })
  }
}
