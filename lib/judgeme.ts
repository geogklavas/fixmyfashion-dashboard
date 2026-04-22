import { cache } from 'react'

export type JudgeMeRating = {
  average: number
  count: number
}

// Server-side fetch of the Judge.me store-level average rating + review count.
// Per spec: same value for ALL brands ("FixMyFashion service rating").
// Requires JUDGEME_API_TOKEN and JUDGEME_SHOP_DOMAIN env vars; returns null
// when either is missing so the dashboard shows a graceful '—' placeholder.
export const getStoreRating = cache(async (): Promise<JudgeMeRating | null> => {
  const token = process.env.JUDGEME_API_TOKEN
  const shop = process.env.JUDGEME_SHOP_DOMAIN
  if (!token || !shop) return null

  try {
    const url = new URL('https://judge.me/api/v1/reviews/index_with_meta.json')
    url.searchParams.set('api_token', token)
    url.searchParams.set('shop_domain', shop)
    url.searchParams.set('per_page', '1')

    const res = await fetch(url.toString(), { next: { revalidate: 600 } }) // 10-min server cache
    if (!res.ok) {
      console.warn('[judgeme] non-200 from Judge.me', res.status)
      return null
    }
    const body = (await res.json()) as {
      meta?: { average_rating?: number | string; review_count?: number | string }
    }
    const avg = Number(body.meta?.average_rating ?? 0)
    const count = Number(body.meta?.review_count ?? 0)
    if (!Number.isFinite(avg) || !Number.isFinite(count)) return null
    return { average: Math.round(avg * 10) / 10, count }
  } catch (err) {
    console.error('[judgeme] fetch failed', err)
    return null
  }
})
