import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const API_VERSION = '2024-01'

// Lists the 50 most recent orders in the store with their tags, regardless of
// brand filter. Used to diagnose tag-format mismatches when a brand dashboard
// shows 0 repairs despite the store having relevant orders.
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'admin_only' }, { status: 403 })
  }

  const domain = process.env.SHOPIFY_STORE_DOMAIN
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  if (!domain || !token) {
    return NextResponse.json({ error: 'shopify_env_missing' }, { status: 500 })
  }

  const query = /* GraphQL */ `
    query RecentOrders {
      orders(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            tags
            displayFinancialStatus
          }
        }
      }
    }
  `

  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query }),
    cache: 'no-store',
  })
  const json = await res.json()
  if (json.errors) {
    return NextResponse.json({ error: 'shopify_error', details: json.errors }, { status: 500 })
  }

  const edges = json.data?.orders?.edges ?? []
  const orders = edges.map((e: { node: { id: string; name: string; createdAt: string; tags: string[]; displayFinancialStatus: string } }) => ({
    name: e.node.name,
    createdAt: e.node.createdAt,
    tags: e.node.tags,
    status: e.node.displayFinancialStatus,
  }))

  // Aggregate tag counts across these 50 orders
  const tagCounts: Record<string, number> = {}
  for (const o of orders) {
    for (const t of o.tags) {
      tagCounts[t] = (tagCounts[t] ?? 0) + 1
    }
  }
  const allTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([tag, count]) => ({ tag, count }))

  return NextResponse.json({
    shop: domain,
    orderCount: orders.length,
    allTags,
    orders,
  })
}
