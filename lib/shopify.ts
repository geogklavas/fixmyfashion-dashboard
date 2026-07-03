export interface LineItem {
  title: string
  price: { amount: string }
}

export interface Fulfillment {
  createdAt: string
  status: string
}

export interface ShopifyOrder {
  id: string
  name: string
  createdAt: string
  tags: string[]
  financialStatus: string
  customerEmail: string | null
  shippingCity: string | null
  lineItems: LineItem[]
  fulfillments: Fulfillment[]
}

export interface BrandConfig {
  // Internal alias mapped from the `subdomain` metaobject field. Stays as
  // `brandHandle` throughout dashboard code (JWT, URL routing, tag filtering).
  brandHandle: string
  brandName: string
  logo: string
  primary: string
  secondary: string
  returnUrl: string
  logoUrl: string
  heroImageUrl: string
  brandDescription: string
  buttonText: string
  allowedCategories: string[]
}

export interface MonthlyData {
  month: string
  count: number
}

export interface TypeBreakdown {
  type: string
  count: number
}

export interface BrandStats {
  totalRepairs: number
  thisMonthRepairs: number
  avgTurnaroundDays: number
  avgSatisfactionScore: number
  pipelineCounts: Record<string, number>
  monthlyVolume: MonthlyData[]
  repairTypeBreakdown: TypeBreakdown[]
}

const API_VERSION = '2024-01'

function endpoint(): string {
  const domain = process.env.SHOPIFY_STORE_DOMAIN
  if (!domain) throw new Error('SHOPIFY_STORE_DOMAIN is not set')
  return `https://${domain}/admin/api/${API_VERSION}/graphql.json`
}

async function shopifyQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  if (!token) throw new Error('SHOPIFY_ADMIN_ACCESS_TOKEN is not set')
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data as T
}

const ORDERS_QUERY = /* GraphQL */ `
  query GetBrandRepairs($q: String!, $cursor: String) {
    orders(first: 50, after: $cursor, query: $q, sortKey: CREATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          name
          createdAt
          tags
          displayFinancialStatus
          email
          shippingAddress { city }
          lineItems(first: 5) {
            edges {
              node {
                title
                originalUnitPriceSet { shopMoney { amount } }
              }
            }
          }
          fulfillments { createdAt status }
        }
      }
      pageInfo { hasNextPage }
    }
  }
`

type OrdersResponse = {
  orders: {
    edges: {
      cursor: string
      node: {
        id: string
        name: string
        createdAt: string
        tags: string[]
        displayFinancialStatus: string
        email: string | null
        shippingAddress: { city: string | null } | null
        lineItems: { edges: { node: { title: string; originalUnitPriceSet: { shopMoney: { amount: string } } } }[] }
        fulfillments: { createdAt: string; status: string }[]
      }
    }[]
    pageInfo: { hasNextPage: boolean }
  }
}

export async function getBrandOrders(brandHandle: string): Promise<ShopifyOrder[]> {
  const tag = `repair-b2b-${brandHandle}`
  const q = `tag:${tag}`
  let cursor: string | undefined
  const orders: ShopifyOrder[] = []
  // Cap to 10 pages (500 orders) as a safety net
  for (let i = 0; i < 10; i++) {
    const data = await shopifyQuery<OrdersResponse>(ORDERS_QUERY, { q, cursor })
    for (const edge of data.orders.edges) {
      const n = edge.node
      orders.push({
        id: n.id,
        name: n.name,
        createdAt: n.createdAt,
        tags: n.tags,
        financialStatus: n.displayFinancialStatus,
        customerEmail: n.email,
        shippingCity: n.shippingAddress?.city ?? null,
        lineItems: n.lineItems.edges.map((e) => ({
          title: e.node.title,
          price: { amount: e.node.originalUnitPriceSet.shopMoney.amount },
        })),
        fulfillments: n.fulfillments,
      })
    }
    if (!data.orders.pageInfo.hasNextPage) break
    cursor = data.orders.edges.at(-1)?.cursor
    if (!cursor) break
  }
  return orders
}

// Metaobject type handle is `brandconfig` (one word, no underscore).
// Fields are fetched as `{ key value }` array — DO NOT switch to structured
// field-by-name access: the `"allowed Categories"` field key contains a space
// and capital C, which breaks GraphQL by-name field selection.
const BRAND_CONFIG_QUERY = /* GraphQL */ `
  query GetBrandConfig {
    metaobjects(type: "brandconfig", first: 50) {
      edges {
        node {
          fields { key value }
        }
      }
    }
  }
`

type BrandConfigResponse = {
  metaobjects: {
    edges: { node: { fields: { key: string; value: string }[] } }[]
  }
}

// Parse the "allowed Categories" field. Shopify stores it either as a comma-
// separated string ("category:pants, category:jackets") or as a JSON-encoded
// list (`["category:pants","category:jackets"]`) depending on whether the
// metaobject field is text or list.text. Values carry a `category:` prefix
// that must be stripped before display.
export function parseAllowedCategories(raw: string | undefined | null): string[] {
  if (!raw) return []
  const trimmed = raw.trim()
  const strip = (s: string): string => {
    const t = String(s).trim()
    return t.startsWith('category:') ? t.slice('category:'.length).trim() : t
  }
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map(strip).filter(Boolean)
      }
    } catch {
      // fall through to comma-split
    }
  }
  return trimmed.split(',').map(strip).filter(Boolean)
}

export type BrandConfigDiagnostic = {
  matchedHandle: string | null
  candidateHandles: string[]
  rawFields: Record<string, string> | null
  parsedConfig: BrandConfig | null
}

// Map raw metaobject fields to the internal BrandConfig shape. `subdomain`
// on the metaobject becomes `brandHandle` in TS — the alias is preserved
// throughout dashboard code (JWT, URL routing, tag filtering).
function mapFieldsToBrandConfig(
  fields: Record<string, string>,
  fallbackHandle: string,
): BrandConfig {
  return {
    brandHandle: fields.subdomain ?? fallbackHandle,
    brandName: fields.brand_name ?? fallbackHandle,
    logo: fields.logo ?? '',
    primary: fields.primary ?? '#0F6E56',
    secondary: fields.secondary ?? '',
    returnUrl: fields.return_url ?? '',
    logoUrl: fields.logo_url ?? '',
    heroImageUrl: fields.hero_image_url ?? '',
    brandDescription: fields.brand_description ?? '',
    buttonText: fields.button_text ?? '',
    allowedCategories: parseAllowedCategories(fields['allowed Categories']),
  }
}

// Returns BOTH the parsed config and a diagnostic snapshot. Used by the
// /api/admin/brandconfig-diagnostic endpoint to debug the wrong-categories bug.
export async function getBrandConfigDiagnostic(brandHandle: string): Promise<BrandConfigDiagnostic> {
  const data = await shopifyQuery<BrandConfigResponse>(BRAND_CONFIG_QUERY)
  const candidates: string[] = []
  for (const edge of data.metaobjects.edges) {
    const fields = Object.fromEntries(edge.node.fields.map((f) => [f.key, f.value]))
    candidates.push(fields.subdomain ?? '(missing)')
    if (fields.subdomain === brandHandle) {
      const parsed = mapFieldsToBrandConfig(fields, brandHandle)
      return { matchedHandle: fields.subdomain, candidateHandles: candidates, rawFields: fields, parsedConfig: parsed }
    }
  }
  return { matchedHandle: null, candidateHandles: candidates, rawFields: null, parsedConfig: null }
}

export async function getBrandConfig(brandHandle: string): Promise<BrandConfig | null> {
  const data = await shopifyQuery<BrandConfigResponse>(BRAND_CONFIG_QUERY)
  for (const edge of data.metaobjects.edges) {
    const fields = Object.fromEntries(edge.node.fields.map((f) => [f.key, f.value]))
    if (fields.subdomain === brandHandle) {
      return mapFieldsToBrandConfig(fields, brandHandle)
    }
  }
  return null
}

export type RepairStatus = 'Dispatched' | 'In workshop' | 'Quote sent' | 'Pending'

export function detectStatus(order: Pick<ShopifyOrder, 'tags' | 'fulfillments'>): RepairStatus {
  if (order.fulfillments.length > 0) return 'Dispatched'
  if (order.tags.includes('repair-in-progress')) return 'In workshop'
  if (order.tags.includes('repair-quote-sent')) return 'Quote sent'
  return 'Pending'
}

export function detectJobCategory(tags: string[]): string {
  const t = tags.find((x) => x.startsWith('job-cat-'))
  return t ? t.replace('job-cat-', '') : 'unknown'
}

export function detectJobType(tags: string[]): string {
  const t = tags.find((x) => x.startsWith('job-type-'))
  return t ? t.replace('job-type-', '') : 'other'
}

export function isFulfilledInLastDays(order: Pick<ShopifyOrder, 'fulfillments'>, days: number): boolean {
  const f = order.fulfillments[0]
  if (!f) return false
  const age = (Date.now() - new Date(f.createdAt).getTime()) / 86_400_000
  return age <= days
}
