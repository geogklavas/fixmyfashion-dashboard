import type { ShopifyOrder, BrandConfig } from './shopify'

const GARMENTS = ['Jeans', 'Jacket', 'Trousers', 'Shirt', 'Knitwear', 'Dress']
const CITIES = ['Athens', 'Thessaloniki', 'Patras', 'Larissa', 'Heraklion', 'Volos']
const CUSTOMERS = [
  'anna@example.gr',
  'kostas@example.gr',
  'maria@example.gr',
  'yiannis@example.gr',
  'eleni@example.gr',
  'nikos@example.gr',
  'sofia@example.gr',
  'dimitris@example.gr',
]

// Spec: three real status states drive the dashboard.
// Orders older than ~4 days progress to repair-in-progress; older than ~8 days become Fulfilled.
function tagsFor(daysBack: number, i: number): string[] {
  const t: string[] = []
  // repair-b2b-{handle} is added by caller
  if (daysBack >= 1) t.push('repair-quote-sent')
  if (daysBack >= 4) t.push('repair-in-progress')
  // job classification once it enters the workshop
  if (daysBack >= 4) {
    const cat = pickJobCat(i)
    t.push(`job-cat-${cat}`)
    if (cat === 'repair' || cat === 'alteration') {
      t.push(`job-type-${pickJobType(i, cat)}`)
    }
  }
  return t
}

function seed(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function pick<T>(arr: readonly T[], n: number): T {
  return arr[Math.floor(seed(n) * arr.length)]
}

function pickJobCat(i: number): string {
  const r = seed(i + 17)
  if (r < 0.6) return 'repair'
  if (r < 0.85) return 'alteration'
  if (r < 0.95) return 'cleaning'
  return 'colour'
}

function pickJobType(i: number, cat: string): string {
  const r = seed(i + 23)
  if (cat === 'repair') {
    if (r < 0.3) return 'repair-zipper'
    if (r < 0.55) return 'repair-seam'
    if (r < 0.75) return 'repair-hole'
    if (r < 0.9) return 'repair-button'
    return 'repair-else'
  }
  // alteration
  if (r < 0.55) return 'alter-height'
  if (r < 0.85) return 'alter-width'
  return 'alter-else'
}

function priceFor(n: number): string {
  return (15 + Math.floor(seed(n + 7) * 40)).toFixed(2)
}

function cityFor(i: number): string {
  const r = seed(i + 11)
  if (r < 0.65) return 'Athens'
  if (r < 0.85) return 'Thessaloniki'
  return CITIES[2 + Math.floor(seed(i + 13) * 4)]
}

function makeOrder(i: number, brandHandle: string): ShopifyOrder {
  const now = Date.now()
  const daysBack = Math.floor(seed(i + 1) * 180)
  const created = new Date(now - daysBack * 86_400_000)

  const tags = [`repair-b2b-${brandHandle}`, ...tagsFor(daysBack, i)]

  const garment = pick(GARMENTS, i)
  const title = garment

  // Fulfilled when the order is at least ~8 days old.
  const fulfillments =
    daysBack >= 8
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
    customerEmail: CUSTOMERS[i % CUSTOMERS.length],
    shippingCity: cityFor(i),
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
