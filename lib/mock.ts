import type { ShopifyOrder, BrandConfig } from './shopify'

const REPAIR_TYPES = [
  'Zip replacement',
  'Hem adjustment',
  'Seam repair',
  'Button fix',
  'Waist alteration',
  'Knitwear darning',
]
const GARMENTS = ['Jeans', 'Jacket', 'Trousers', 'Shirt', 'Knitwear', 'Dress']
const CITIES = ['Athens', 'Thessaloniki', 'Patras', 'Larissa', 'Heraklion', 'Volos']

const STAGE_FLOW: string[] = [
  'repair-quote-sent',
  'repair-confirmed',
  'repair-received',
  'repair-in-progress',
  'repair-completed',
  'repair-dispatched',
  'repair-delivered',
]

function seed(n: number) {
  // deterministic pseudo-random based on index
  let x = Math.sin(n * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function pick<T>(arr: readonly T[], n: number): T {
  return arr[Math.floor(seed(n) * arr.length)]
}

function priceFor(n: number): string {
  return (15 + Math.floor(seed(n + 7) * 40)).toFixed(2)
}

function makeOrder(i: number, brandHandle: string): ShopifyOrder {
  const now = Date.now()
  const daysBack = Math.floor(seed(i + 1) * 180)
  const created = new Date(now - daysBack * 86_400_000)

  // Progress depends on age — older orders are further in pipeline
  const maxStage = Math.min(STAGE_FLOW.length, Math.floor(daysBack / 4) + 1)
  const stage = Math.max(1, maxStage)
  const tags = [`repair-b2b-${brandHandle}`, ...STAGE_FLOW.slice(0, stage)]

  const garment = pick(GARMENTS, i)
  const repair = pick(REPAIR_TYPES, i + 3)
  const title = `${garment} — ${repair}`

  const fulfillments =
    stage >= 6
      ? [
          {
            createdAt: new Date(created.getTime() + (3 + (i % 6)) * 86_400_000).toISOString(),
            status: 'success',
          },
        ]
      : []

  return {
    id: `gid://shopify/Order/${1000 + i}`,
    name: `#${1000 + i}`,
    createdAt: created.toISOString(),
    tags,
    financialStatus: 'PAID',
    lineItems: [{ title, price: { amount: priceFor(i) } }],
    fulfillments,
  }
}

export function mockBrandOrders(brandHandle: string, count = 60): ShopifyOrder[] {
  return Array.from({ length: count }, (_, i) => makeOrder(i, brandHandle)).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function mockBrandConfig(brandHandle: string): BrandConfig {
  const nameMap: Record<string, string> = {
    becasual: 'be-casual',
  }
  return {
    brandHandle,
    brandName: nameMap[brandHandle] ?? brandHandle,
    brandLogo: '',
    primaryColor: '#0F6E56',
    portalUrl: `${brandHandle}.fixmyfashion.gr`,
    allowedCategories: ['pants', 'jackets', 'shirts', 'dresses'],
    discountCode: brandHandle === 'becasual' ? 'BECASUAL50' : null,
  }
}

export function mockCityFor(i: number): string {
  // 65% Athens, 20% Thessaloniki, rest spread
  const r = seed(i + 11)
  if (r < 0.65) return 'Athens'
  if (r < 0.85) return 'Thessaloniki'
  return CITIES[2 + Math.floor(seed(i + 13) * 4)]
}
