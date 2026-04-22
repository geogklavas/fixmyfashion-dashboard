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

// ---------- Pipeline (3 counters per SPEC §2.2) ----------
// Orders: every brand order (all statuses)
// In workshop: tag repair-in-progress + fulfillments empty
// Delivered: fulfillments not empty (Fulfilled status)

export function pipelineCounts(orders: ShopifyOrder[]): {
  orders: number
  inWorkshop: number
  delivered: number
} {
  let inWorkshop = 0
  let delivered = 0
  for (const o of orders) {
    if (o.fulfillments.length > 0) {
      delivered++
      continue
    }
    if (o.tags.includes('repair-in-progress')) inWorkshop++
  }
  return { orders: orders.length, inWorkshop, delivered }
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

// Per SPEC §3.2 Section 2: separate breakdowns per top-level category.

export const REPAIR_JOB_TYPES = ['repair-seam', 'repair-button', 'repair-hole', 'repair-zipper', 'repair-else'] as const
export const ALTERATION_JOB_TYPES = ['alter-height', 'alter-width', 'alter-else'] as const

export function repairTypeBreakdown(
  orders: ShopifyOrder[],
): { type: string; label: string; count: number; share: number }[] {
  const repairOrders = orders.filter((o) => jobCategoryOf(o.tags) === 'repair')
  const counts: Record<string, number> = {}
  for (const o of repairOrders) {
    const t = jobTypeOf(o.tags)
    if (!t.startsWith('repair-')) continue
    counts[t] = (counts[t] ?? 0) + 1
  }
  const total = repairOrders.length || 1
  return REPAIR_JOB_TYPES.filter((t) => counts[t])
    .map((type) => ({
      type,
      label: JOB_TYPE_LABELS[type] ?? type,
      count: counts[type],
      share: Math.round((counts[type] / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}

export function alterationTypeBreakdown(
  orders: ShopifyOrder[],
): { type: string; label: string; count: number; share: number }[] {
  const alterationOrders = orders.filter((o) => jobCategoryOf(o.tags) === 'alteration')
  const counts: Record<string, number> = {}
  for (const o of alterationOrders) {
    const t = jobTypeOf(o.tags)
    if (!t.startsWith('alter-')) continue
    counts[t] = (counts[t] ?? 0) + 1
  }
  const total = alterationOrders.length || 1
  return ALTERATION_JOB_TYPES.filter((t) => counts[t])
    .map((type) => ({
      type,
      label: JOB_TYPE_LABELS[type] ?? type,
      count: counts[type],
      share: Math.round((counts[type] / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}

export function categoryOrderCount(orders: ShopifyOrder[], category: 'repair' | 'alteration'): number {
  return orders.filter((o) => jobCategoryOf(o.tags) === category).length
}

// Counts and shares for the 4 service categories — used for Section 1 ranked cards.
export function categoryCardData(
  orders: ShopifyOrder[],
): { category: string; label: string; count: number; share: number }[] {
  const counts: Record<string, number> = { repair: 0, alteration: 0, cleaning: 0, colour: 0 }
  let classified = 0
  for (const o of orders) {
    const cat = jobCategoryOf(o.tags)
    if (cat in counts) {
      counts[cat]++
      classified++
    }
  }
  const total = classified || 1
  const labelOf: Record<string, string> = {
    repair: 'Repair',
    alteration: 'Alteration',
    cleaning: 'Cleaning',
    colour: 'Colour',
  }
  return JOB_CATEGORIES.map((cat) => ({
    category: cat,
    label: labelOf[cat] ?? cat,
    count: counts[cat],
    share: Math.round((counts[cat] / total) * 100),
  })).sort((a, b) => b.count - a.count)
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

// Garment detection from product title was REMOVED in Sprint 6 — unreliable
// across Greek/English titles and frequently mislabeled. Job classification
// now lives entirely in job-cat-* / job-type-* tags applied at intake.

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

// productInsights removed in Sprint 6 — replaced by Section 1 (categoryCardData)
// + Section 2 (repairTypeBreakdown / alterationTypeBreakdown) on the Analytics
// tab. Garment hint from product title was unreliable.
