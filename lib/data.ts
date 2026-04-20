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
