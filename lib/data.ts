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
    const s = detectStatus(o.tags)
    counts[s] = (counts[s] ?? 0) + 1
  }
  return counts
}

export function pipelineCounts(orders: ShopifyOrder[]): {
  received: number
  inProgress: number
  qaComplete: number
  dispatched: number
} {
  let received = 0
  let inProgress = 0
  let qaComplete = 0
  let dispatched = 0
  for (const o of orders) {
    const t = o.tags
    if (t.includes('repair-delivered')) continue
    if (t.includes('repair-dispatched')) {
      dispatched++
      continue
    }
    if (t.includes('repair-completed')) {
      qaComplete++
      continue
    }
    if (t.includes('repair-in-progress')) {
      inProgress++
      continue
    }
    if (t.includes('repair-received')) {
      received++
      continue
    }
  }
  return { received, inProgress, qaComplete, dispatched }
}

export function thisMonthCount(orders: ShopifyOrder[]): number {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  return orders.filter((o) => {
    const d = new Date(o.createdAt)
    return d.getFullYear() === y && d.getMonth() === m
  }).length
}

export function lastMonthCount(orders: ShopifyOrder[]): number {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() - 1
  const refY = m < 0 ? y - 1 : y
  const refM = (m + 12) % 12
  return orders.filter((o) => {
    const d = new Date(o.createdAt)
    return d.getFullYear() === refY && d.getMonth() === refM
  }).length
}

export function monthlyVolume(orders: ShopifyOrder[], months = 6): { month: string; count: number }[] {
  const now = new Date()
  const buckets: { key: string; month: string; count: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const label = d.toLocaleDateString('en-GB', { month: 'short' })
    buckets.push({ key, month: label, count: 0 })
  }
  for (const o of orders) {
    const d = new Date(o.createdAt)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = buckets.find((b) => b.key === key)
    if (bucket) bucket.count++
  }
  return buckets.map(({ month, count }) => ({ month, count }))
}

export function averageTurnaroundDays(orders: ShopifyOrder[]): number {
  const completed = orders.filter((o) => o.tags.includes('repair-delivered') && o.fulfillments.length > 0)
  if (completed.length === 0) return 0
  const total = completed.reduce((sum, o) => {
    const start = new Date(o.createdAt).getTime()
    const end = new Date(o.fulfillments[0].createdAt).getTime()
    return sum + (end - start) / 86_400_000
  }, 0)
  return Math.round((total / completed.length) * 10) / 10
}

// ---------- Sustainability ----------

export const CO2_PER_REPAIR = 3 // kg
export const WATER_PER_REPAIR = 2700 // litres

export function completedCount(orders: ShopifyOrder[]): number {
  return orders.filter((o) => o.tags.includes('repair-delivered')).length
}

export function sustainabilityTotals(orders: ShopifyOrder[]) {
  const completed = completedCount(orders)
  return {
    completed,
    co2Kg: completed * CO2_PER_REPAIR,
    waterL: completed * WATER_PER_REPAIR,
    rerepairRate: 0, // no tag for re-repair yet
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
  // Count delivered orders by the month they were delivered (fulfillment) — fall back to createdAt
  for (const o of orders) {
    if (!o.tags.includes('repair-delivered')) continue
    const deliveredAt = o.fulfillments[0]?.createdAt ?? o.createdAt
    const d = new Date(deliveredAt)
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

// ---------- Analytics ----------

const REPAIR_TYPES = ['Zip', 'Hem', 'Seam', 'Button', 'Knitwear', 'Other'] as const
const REPAIR_TYPE_COLORS: Record<string, string> = {
  Zip: '#0F6E56',
  Hem: '#185FA5',
  Seam: '#BA7517',
  Button: '#534AB7',
  Knitwear: '#6b7280',
  Other: '#B8BAC0',
}
export { REPAIR_TYPES, REPAIR_TYPE_COLORS }

function detectTypeFromTitle(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('zip')) return 'Zip'
  if (t.includes('hem')) return 'Hem'
  if (t.includes('seam')) return 'Seam'
  if (t.includes('button')) return 'Button'
  if (t.includes('knit') || t.includes('darn') || t.includes('wool')) return 'Knitwear'
  return 'Other'
}

export function repairTypeBreakdown(orders: ShopifyOrder[]): { type: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const o of orders) {
    const title = o.lineItems[0]?.title ?? ''
    const type = detectTypeFromTitle(title)
    counts[type] = (counts[type] ?? 0) + 1
  }
  return REPAIR_TYPES.map((t) => ({ type: t, count: counts[t] ?? 0 })).filter((r) => r.count > 0)
}

export function turnaroundDistribution(orders: ShopifyOrder[]): { bucket: string; count: number }[] {
  const completed = orders.filter((o) => o.tags.includes('repair-delivered') && o.fulfillments.length > 0)
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

export function onTimeRate(orders: ShopifyOrder[]): number {
  const completed = orders.filter((o) => o.tags.includes('repair-delivered') && o.fulfillments.length > 0)
  if (completed.length === 0) return 0
  const onTime = completed.filter((o) => {
    const days = (new Date(o.fulfillments[0].createdAt).getTime() - new Date(o.createdAt).getTime()) / 86_400_000
    return days <= 10
  }).length
  return Math.round((onTime / completed.length) * 100)
}

export function monthlyByType(
  orders: ShopifyOrder[],
  months = 6,
): { month: string; [repairType: string]: string | number }[] {
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
  for (const o of orders) {
    const d = new Date(o.createdAt)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = buckets.find((b) => b.key === key)
    if (!bucket) continue
    const type = detectTypeFromTitle(o.lineItems[0]?.title ?? '')
    bucket.counts[type] = (bucket.counts[type] ?? 0) + 1
  }
  return buckets.map((b) => {
    const row: { month: string; [k: string]: string | number } = { month: b.month }
    for (const t of REPAIR_TYPES) row[t] = b.counts[t] ?? 0
    return row
  })
}

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
  if (t.includes('jacket') || t.includes('coat')) return 'JK'
  if (t.includes('trouser') || t.includes('pant')) return 'TR'
  if (t.includes('shirt') || t.includes('blouse') || t.includes('top')) return 'SH'
  if (t.includes('knit') || t.includes('wool') || t.includes('sweater')) return 'KW'
  if (t.includes('dress') || t.includes('skirt')) return 'DR'
  return '—'
}

// ---------- Geo / Map ----------

const REGION_MAP: Record<string, string> = {
  Athens: 'Attica',
  Piraeus: 'Attica',
  Thessaloniki: 'Central Macedonia',
  Katerini: 'Central Macedonia',
  Serres: 'Central Macedonia',
}

export function cityCounts(orders: ShopifyOrder[], getCityForIndex: (i: number) => string): { city: string; count: number }[] {
  const counts = new Map<string, number>()
  orders.forEach((_, i) => {
    const city = getCityForIndex(i)
    counts.set(city, (counts.get(city) ?? 0) + 1)
  })
  return Array.from(counts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
}

export function regionBreakdown(cityData: { city: string; count: number }[]): {
  attica: number
  centralMacedonia: number
  rest: number
  total: number
} {
  let attica = 0
  let centralMacedonia = 0
  let rest = 0
  for (const { city, count } of cityData) {
    const region = REGION_MAP[city] ?? 'Rest'
    if (region === 'Attica') attica += count
    else if (region === 'Central Macedonia') centralMacedonia += count
    else rest += count
  }
  const total = attica + centralMacedonia + rest
  return { attica, centralMacedonia, rest, total }
}

export function pickupMethodByMonth(orders: ShopifyOrder[], months = 6): { month: string; ELTA: number; BoxNow: number }[] {
  const now = new Date()
  const buckets: { key: string; month: string; ELTA: number; BoxNow: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleDateString('en-GB', { month: 'short' }),
      ELTA: 0,
      BoxNow: 0,
    })
  }
  // Best-effort split: tag-based if present, otherwise deterministic by order id
  for (const o of orders) {
    const d = new Date(o.createdAt)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = buckets.find((b) => b.key === key)
    if (!bucket) continue
    const isBoxNow = o.tags.includes('repair-boxnow') || o.id.charCodeAt(o.id.length - 1) % 3 === 0
    if (isBoxNow) bucket.BoxNow++
    else bucket.ELTA++
  }
  return buckets.map(({ month, ELTA, BoxNow }) => ({ month, ELTA, BoxNow }))
}

export function productInsights(
  orders: ShopifyOrder[],
): { garment: string; repair: string; count: number; share: number }[] {
  const combos = new Map<string, { garment: string; repair: string; count: number }>()
  for (const o of orders) {
    const title = o.lineItems[0]?.title ?? ''
    const garment = GARMENT_LABELS[detectGarmentFromTitle(title)]
    const repair = detectTypeFromTitle(title)
    const key = `${garment}__${repair}`
    const existing = combos.get(key)
    if (existing) existing.count++
    else combos.set(key, { garment, repair, count: 1 })
  }
  const total = orders.length || 1
  return Array.from(combos.values())
    .map((c) => ({ ...c, share: Math.round((c.count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
}
