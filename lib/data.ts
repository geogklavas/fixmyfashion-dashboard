import { cache } from 'react'
import {
  getBrandOrders as shopifyGetBrandOrders,
  getBrandConfig as shopifyGetBrandConfig,
  detectStatus,
  type ShopifyOrder,
  type BrandConfig,
} from './shopify'
import { mockBrandOrders, mockBrandConfig } from './mock'

function useMock(): boolean {
  return !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || !process.env.SHOPIFY_STORE_DOMAIN
}

export const getOrders = cache(async (brandHandle: string): Promise<ShopifyOrder[]> => {
  if (useMock()) return mockBrandOrders(brandHandle)
  try {
    return await shopifyGetBrandOrders(brandHandle)
  } catch (err) {
    console.error('[data.getOrders] Shopify failed, using mock', err)
    return mockBrandOrders(brandHandle)
  }
})

export const getConfig = cache(async (brandHandle: string): Promise<BrandConfig> => {
  if (useMock()) return mockBrandConfig(brandHandle)
  try {
    const cfg = await shopifyGetBrandConfig(brandHandle)
    return cfg ?? mockBrandConfig(brandHandle)
  } catch (err) {
    console.error('[data.getConfig] Shopify failed, using mock', err)
    return mockBrandConfig(brandHandle)
  }
})

export function isUsingMockData(): boolean {
  return useMock()
}

// ---------- Aggregation helpers ----------

export function countByStatus(orders: ShopifyOrder[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const o of orders) {
    const s = detectStatus(o)
    counts[s] = (counts[s] ?? 0) + 1
  }
  return counts
}

// ---------- Fulfilled helpers ----------
// "Fulfilled" = dispatched to customer = order.fulfillments.length > 0.
// Replaces the old repair-delivered tag check everywhere.

export function fulfilledOrders(orders: ShopifyOrder[]): ShopifyOrder[] {
  return orders.filter((o) => o.fulfillments.length > 0)
}

function fulfilledAt(order: ShopifyOrder): Date | null {
  const f = order.fulfillments[0]
  return f ? new Date(f.createdAt) : null
}

function inMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month
}

// ---------- Pipeline (2 counters) ----------

export function pipelineCounts(orders: ShopifyOrder[]): {
  inWorkshop: number
  returningRecently: number
} {
  let inWorkshop = 0
  let returningRecently = 0
  for (const o of orders) {
    if (o.fulfillments.length > 0) {
      // Returning to customers = fulfilled in last 10 days
      const age = (Date.now() - new Date(o.fulfillments[0].createdAt).getTime()) / 86_400_000
      if (age <= 10) returningRecently++
      continue
    }
    if (o.tags.includes('repair-in-progress')) inWorkshop++
  }
  return { inWorkshop, returningRecently }
}

// ---------- This / last month (Fulfilled-based) ----------

export function thisMonthCount(orders: ShopifyOrder[]): number {
  const now = new Date()
  return fulfilledOrders(orders).filter((o) => {
    const f = fulfilledAt(o)
    return f != null && inMonth(f, now.getFullYear(), now.getMonth())
  }).length
}

export function lastMonthCount(orders: ShopifyOrder[]): number {
  const now = new Date()
  const rawM = now.getMonth() - 1
  const refY = rawM < 0 ? now.getFullYear() - 1 : now.getFullYear()
  const refM = (rawM + 12) % 12
  return fulfilledOrders(orders).filter((o) => {
    const f = fulfilledAt(o)
    return f != null && inMonth(f, refY, refM)
  }).length
}

// ---------- Monthly volume (Fulfilled by fulfillment month) ----------

export function monthlyVolume(orders: ShopifyOrder[], months = 6): { month: string; count: number }[] {
  const now = new Date()
  const buckets: { key: string; month: string; count: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const label = d.toLocaleDateString('en-GB', { month: 'short' })
    buckets.push({ key, month: label, count: 0 })
  }
  for (const o of fulfilledOrders(orders)) {
    const f = fulfilledAt(o)
    if (!f) continue
    const key = `${f.getFullYear()}-${f.getMonth()}`
    const bucket = buckets.find((b) => b.key === key)
    if (bucket) bucket.count++
  }
  return buckets.map(({ month, count }) => ({ month, count }))
}

// ---------- Turnaround ----------

export function averageTurnaroundDays(orders: ShopifyOrder[]): number {
  const completed = fulfilledOrders(orders)
  if (completed.length === 0) return 0
  const total = completed.reduce((sum, o) => {
    const start = new Date(o.createdAt).getTime()
    const end = new Date(o.fulfillments[0].createdAt).getTime()
    return sum + (end - start) / 86_400_000
  }, 0)
  return Math.round((total / completed.length) * 10) / 10
}

// % of Fulfilled orders dispatched within N days of createdAt.
export function deliveredWithinDays(orders: ShopifyOrder[], days: number): { pct: number; hits: number; total: number } {
  const completed = fulfilledOrders(orders)
  if (completed.length === 0) return { pct: 0, hits: 0, total: 0 }
  const hits = completed.filter((o) => {
    const diff = (new Date(o.fulfillments[0].createdAt).getTime() - new Date(o.createdAt).getTime()) / 86_400_000
    return diff <= days
  }).length
  return { pct: Math.round((hits / completed.length) * 100), hits, total: completed.length }
}

// ---------- Sustainability ----------

export const CO2_PER_REPAIR = 3 // kg (WRAP UK benchmark)

export function completedCount(orders: ShopifyOrder[]): number {
  return fulfilledOrders(orders).length
}

export function sustainabilityTotals(orders: ShopifyOrder[]) {
  const completed = completedCount(orders)
  return {
    completed,
    co2Kg: completed * CO2_PER_REPAIR,
    rerepairRate: 0, // no re-repair signal in Shopify yet
  }
}

export function cumulativeCO2ByMonth(
  orders: ShopifyOrder[],
  months = 6,
): { month: string; co2Kg: number }[] {
  const now = new Date()
  const buckets: { key: string; month: string; delivered: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleDateString('en-GB', { month: 'short' }),
      delivered: 0,
    })
  }
  // Fulfilled orders grouped by fulfillment month, then accumulated × 3kg CO2.
  for (const o of fulfilledOrders(orders)) {
    const d = new Date(o.fulfillments[0].createdAt)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = buckets.find((b) => b.key === key)
    if (bucket) bucket.delivered++
  }
  let running = 0
  return buckets.map((b) => {
    running += b.delivered
    return { month: b.month, co2Kg: running * CO2_PER_REPAIR }
  })
}

// ---------- Customer metrics (Analytics KPIs) ----------

export function repeatCustomerRate(orders: ShopifyOrder[]): { pct: number; repeaters: number; unique: number } {
  const completed = fulfilledOrders(orders)
  const byEmail = new Map<string, number>()
  for (const o of completed) {
    const key = (o.customerEmail ?? '').trim().toLowerCase()
    if (!key) continue
    byEmail.set(key, (byEmail.get(key) ?? 0) + 1)
  }
  const unique = byEmail.size
  if (unique === 0) return { pct: 0, repeaters: 0, unique: 0 }
  let repeaters = 0
  byEmail.forEach((count) => {
    if (count >= 2) repeaters++
  })
  return { pct: Math.round((repeaters / unique) * 100), repeaters, unique }
}

// ---------- Analytics (job-cat-* / job-type-* tag based) ----------

export const JOB_CATEGORIES = ['repair', 'alteration', 'cleaning', 'colour'] as const
export type JobCategory = (typeof JOB_CATEGORIES)[number]

export const JOB_CATEGORY_COLORS: Record<string, string> = {
  repair: '#0F6E56',
  alteration: '#185FA5',
  cleaning: '#BA7517',
  colour: '#534AB7',
  unknown: '#B8BAC0',
}

export const JOB_TYPE_LABELS: Record<string, string> = {
  'repair-seam': 'Seam repair',
  'repair-button': 'Button repair',
  'repair-hole': 'Hole repair',
  'repair-zipper': 'Zipper repair',
  'repair-else': 'Other repair',
  'alter-height': 'Hem / length alteration',
  'alter-width': 'Waist / width alteration',
  'alter-else': 'Other alteration',
  other: 'Other',
}

function jobCategoryOf(tags: string[]): string {
  const t = tags.find((x) => x.startsWith('job-cat-'))
  return t ? t.replace('job-cat-', '') : 'unknown'
}

function jobTypeOf(tags: string[]): string {
  const t = tags.find((x) => x.startsWith('job-type-'))
  return t ? t.replace('job-type-', '') : 'other'
}

// Outer ring = category count, only orders that carry a job-cat-* tag.
export function jobCategoryBreakdown(orders: ShopifyOrder[]): { category: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const o of orders) {
    const cat = jobCategoryOf(o.tags)
    if (cat === 'unknown') continue
    counts[cat] = (counts[cat] ?? 0) + 1
  }
  return JOB_CATEGORIES.map((c) => ({ category: c, count: counts[c] ?? 0 })).filter((r) => r.count > 0)
}

// Inner ring = job-type-* breakdown (repairs + alterations only, per spec).
export function jobTypeBreakdown(orders: ShopifyOrder[]): { type: string; label: string; count: number; category: string }[] {
  const counts = new Map<string, { category: string; count: number }>()
  for (const o of orders) {
    const cat = jobCategoryOf(o.tags)
    if (cat !== 'repair' && cat !== 'alteration') continue
    const t = jobTypeOf(o.tags)
    const existing = counts.get(t)
    if (existing) existing.count++
    else counts.set(t, { category: cat, count: 1 })
  }
  return Array.from(counts.entries())
    .map(([type, { category, count }]) => ({ type, label: JOB_TYPE_LABELS[type] ?? type, count, category }))
    .sort((a, b) => b.count - a.count)
}

// Orders that have at least one job-cat-* tag. Used to gate Analytics widgets.
export function classifiedOrderCount(orders: ShopifyOrder[]): number {
  return orders.filter((o) => o.tags.some((t) => t.startsWith('job-cat-'))).length
}

export function turnaroundDistribution(orders: ShopifyOrder[]): { bucket: string; count: number }[] {
  const completed = fulfilledOrders(orders)
  const buckets = ['3d', '4d', '5d', '6d', '7d', '8d', '9d', '10d', '10d+']
  const counts: Record<string, number> = Object.fromEntries(buckets.map((b) => [b, 0]))
  for (const o of completed) {
    const start = new Date(o.createdAt).getTime()
    const end = new Date(o.fulfillments[0].createdAt).getTime()
    const days = Math.max(3, Math.round((end - start) / 86_400_000))
    const key = days >= 10 ? (days === 10 ? '10d' : '10d+') : `${days}d`
    counts[key] = (counts[key] ?? 0) + 1
  }
  return buckets.map((b) => ({ bucket: b, count: counts[b] }))
}

// Monthly stacked bar: Fulfilled orders per month split by job-cat-*.
export function monthlyByCategory(
  orders: ShopifyOrder[],
  months = 6,
): { month: string; [k: string]: string | number }[] {
  const now = new Date()
  const buckets: { key: string; month: string; counts: Record<string, number> }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleDateString('en-GB', { month: 'short' }),
      counts: {},
    })
  }
  for (const o of fulfilledOrders(orders)) {
    const d = new Date(o.fulfillments[0].createdAt)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = buckets.find((b) => b.key === key)
    if (!bucket) continue
    const cat = jobCategoryOf(o.tags)
    if (cat === 'unknown') continue
    bucket.counts[cat] = (bucket.counts[cat] ?? 0) + 1
  }
  return buckets.map((b) => {
    const row: { month: string; [k: string]: string | number } = { month: b.month }
    for (const c of JOB_CATEGORIES) row[c] = b.counts[c] ?? 0
    return row
  })
}

// Garment hint from line item title (best effort, for product insights only).
const GARMENT_LABELS: Record<string, string> = {
  JN: 'Jeans',
  JK: 'Jackets',
  TR: 'Trousers',
  SH: 'Shirts',
  KW: 'Knitwear',
  DR: 'Dresses',
  '—': 'Other',
}

function detectGarmentFromTitle(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('jean') || t.includes('denim')) return 'JN'
  if (t.includes('jacket') || t.includes('coat') || t.includes('μπουφ') || t.includes('παλτ')) return 'JK'
  if (t.includes('trouser') || t.includes('pant') || t.includes('παντ')) return 'TR'
  if (t.includes('shirt') || t.includes('blouse') || t.includes('top') || t.includes('πουκ')) return 'SH'
  if (t.includes('knit') || t.includes('wool') || t.includes('sweater') || t.includes('πλεκτ')) return 'KW'
  if (t.includes('dress') || t.includes('skirt') || t.includes('φουστ') || t.includes('φορεμ')) return 'DR'
  return '—'
}

// ---------- Regional breakdown (Analytics stat block, no map) ----------

const REGION_MAP: Record<string, string> = {
  Athens: 'Attica',
  Piraeus: 'Attica',
  'Αθήνα': 'Attica',
  'Πειραιάς': 'Attica',
  Thessaloniki: 'Central Macedonia',
  'Θεσσαλονίκη': 'Central Macedonia',
  Katerini: 'Central Macedonia',
  Serres: 'Central Macedonia',
}

export function regionBreakdown(orders: ShopifyOrder[]): {
  attica: number
  centralMacedonia: number
  rest: number
  total: number
} {
  let attica = 0
  let centralMacedonia = 0
  let rest = 0
  for (const o of orders) {
    const city = o.shippingCity ?? ''
    const region = REGION_MAP[city] ?? (city ? 'Rest' : null)
    if (!region) continue
    if (region === 'Attica') attica++
    else if (region === 'Central Macedonia') centralMacedonia++
    else rest++
  }
  const total = attica + centralMacedonia + rest
  return { attica, centralMacedonia, rest, total }
}

// ---------- Product insights (garment × job-type, Fulfilled only) ----------

export function productInsights(
  orders: ShopifyOrder[],
): { garment: string; repair: string; count: number; share: number }[] {
  const source = fulfilledOrders(orders)
  const combos = new Map<string, { garment: string; repair: string; count: number }>()
  for (const o of source) {
    const title = o.lineItems[0]?.title ?? ''
    const garment = GARMENT_LABELS[detectGarmentFromTitle(title)]
    const repair = JOB_TYPE_LABELS[jobTypeOf(o.tags)] ?? 'Other'
    const key = `${garment}__${repair}`
    const existing = combos.get(key)
    if (existing) existing.count++
    else combos.set(key, { garment, repair, count: 1 })
  }
  const total = source.length || 1
  return Array.from(combos.values())
    .map((c) => ({ ...c, share: Math.round((c.count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
}
