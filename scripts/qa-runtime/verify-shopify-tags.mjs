#!/usr/bin/env node
// QA Runtime — verify Shopify order tag propagation for a brand.
//
// Run from fixmyfashion-dashboard/:
//   node --env-file=.env.local scripts/qa-runtime/verify-shopify-tags.mjs [--brand=<handle>] [--limit=50] [--json]
//
// Exit code:
//   0 = at least one order carries repair-b2b-<brand> tag AND expected workflow+classification tags present in distribution
//   1 = missing token / GraphQL error
//   2 = no orders found OR tag hygiene issues (e.g. orders missing classification tags)
//
// Reports:
// - Orders count for `tag:repair-b2b-<brand>` filter
// - Workflow tag distribution (repair-quote-sent, repair-in-progress, fulfilled)
// - Classification tag distribution (job-cat-*, job-type-*)
// - Orders missing classification (workflow=in-progress but no job-cat)

const API_VERSION = '2024-01'
const args = process.argv.slice(2)
const brand = (args.find(a => a.startsWith('--brand=')) || '--brand=becasual').split('=')[1]
const limit = Number((args.find(a => a.startsWith('--limit=')) || '--limit=50').split('=')[1])
const jsonOut = args.includes('--json')

const domain = process.env.SHOPIFY_STORE_DOMAIN
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN

if (!domain || !token) {
  console.error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN in env (must be shpat_).')
  process.exit(1)
}

async function gql(query, variables) {
  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data
}

const WORKFLOW_TAGS = ['repair-quote-sent', 'repair-in-progress']
const CAT_PREFIX = 'job-cat-'
const TYPE_PREFIX = 'job-type-'
const REMOVED_TAGS = ['repair-confirmed', 'repair-received', 'repair-completed', 'repair-dispatched', 'repair-delivered', 'repair-cod']

try {
  const data = await gql(`
    query GetBrandOrders($q: String!, $first: Int!) {
      orders(first: $first, query: $q, sortKey: CREATED_AT, reverse: true) {
        edges { node { id name tags fulfillments { createdAt } } }
      }
    }
  `, { q: `tag:repair-b2b-${brand}`, first: limit })

  const orders = data.orders.edges.map(e => e.node)

  const workflowDist = { 'quote-sent': 0, 'in-progress': 0, 'fulfilled': 0, 'none': 0 }
  const catDist = {}
  const typeDist = {}
  const removedTagUsage = {}
  const uncategorizedInProgress = []

  for (const o of orders) {
    const tags = o.tags
    const fulfilled = o.fulfillments && o.fulfillments.length > 0

    if (fulfilled) workflowDist.fulfilled++
    else if (tags.includes('repair-in-progress')) workflowDist['in-progress']++
    else if (tags.includes('repair-quote-sent')) workflowDist['quote-sent']++
    else workflowDist.none++

    const cats = tags.filter(t => t.startsWith(CAT_PREFIX))
    const types = tags.filter(t => t.startsWith(TYPE_PREFIX))
    cats.forEach(t => { catDist[t] = (catDist[t] || 0) + 1 })
    types.forEach(t => { typeDist[t] = (typeDist[t] || 0) + 1 })

    for (const rt of REMOVED_TAGS) {
      if (tags.includes(rt)) removedTagUsage[rt] = (removedTagUsage[rt] || 0) + 1
    }

    if (tags.includes('repair-in-progress') && cats.length === 0) {
      uncategorizedInProgress.push(o.name)
    }
  }

  const issues = []
  if (orders.length === 0) issues.push('no_orders_with_brand_tag')
  if (Object.keys(removedTagUsage).length > 0) issues.push('removed_tags_still_in_use')
  if (uncategorizedInProgress.length > 0) issues.push('uncategorized_in_progress_orders')

  const result = {
    ok: issues.length === 0,
    brand,
    ordersInspected: orders.length,
    workflowDistribution: workflowDist,
    categoryDistribution: catDist,
    typeDistribution: typeDist,
    removedTagUsage,
    uncategorizedInProgress,
    issues,
  }

  if (jsonOut) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Brand: repair-b2b-${brand}`)
    console.log(`Orders inspected: ${orders.length}`)
    console.log(`Workflow distribution:`, workflowDist)
    console.log(`Category distribution:`, catDist)
    console.log(`Type distribution:`, typeDist)
    if (Object.keys(removedTagUsage).length) console.log(`⚠️  Removed tags still in use:`, removedTagUsage)
    if (uncategorizedInProgress.length) console.log(`⚠️  In-progress orders WITHOUT job-cat tag: ${uncategorizedInProgress.join(', ')}`)
    console.log(result.ok ? '✅ Tag hygiene OK.' : `❌ Issues: ${issues.join(', ')}`)
  }
  process.exit(result.ok ? 0 : 2)
} catch (err) {
  if (jsonOut) console.log(JSON.stringify({ ok: false, error: err.message }))
  else console.error('Error:', err.message)
  process.exit(1)
}
