#!/usr/bin/env node
// Shopify BrandConfig metaobject inspector for FixMyFashion.
//
// Run from repo root:
//   node --env-file=.env.local scripts/metaobjects.mjs describe
//   node --env-file=.env.local scripts/metaobjects.mjs list
//   node --env-file=.env.local scripts/metaobjects.mjs read <handle>
//   node --env-file=.env.local scripts/metaobjects.mjs create --handle=<h> --name=<n> [--field key=value ...]
//   node --env-file=.env.local scripts/metaobjects.mjs update <handle> [--field key=value ...]
//
// The metaobject type handle is `brandconfig` (one word, no underscore) —
// verified 2026-07-02 in templates/brand-landing.liquid. See I-R002.

const API_VERSION = '2024-01'
const TYPE_HANDLE = 'brandconfig'

const domain = process.env.SHOPIFY_STORE_DOMAIN
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
if (!domain || !token) {
  console.error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN in env.')
  console.error('Run: vercel env pull .env.local  — then re-run with --env-file=.env.local')
  process.exit(1)
}

async function gql(query, variables) {
  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${body.slice(0, 500)}`)
  }
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2))
  return json.data
}

async function describe() {
  const data = await gql(`
    query {
      metaobjectDefinitionByType(type: "${TYPE_HANDLE}") {
        id
        name
        type
        fieldDefinitions {
          key
          name
          type { name }
          required
          description
        }
      }
    }
  `)
  const def = data.metaobjectDefinitionByType
  if (!def) {
    console.log(`No metaobject definition found for type="${TYPE_HANDLE}".`)
    return
  }
  console.log(`Definition: ${def.name} (type=${def.type}, id=${def.id})`)
  console.log('Fields:')
  for (const f of def.fieldDefinitions) {
    const req = f.required ? ' [required]' : ''
    console.log(`  - ${f.key}  (${f.type.name})${req}${f.description ? '  — ' + f.description : ''}`)
  }
}

async function list() {
  const data = await gql(`
    query {
      metaobjects(type: "${TYPE_HANDLE}", first: 50) {
        edges {
          node {
            id
            handle
            displayName
            fields { key value }
          }
        }
      }
    }
  `)
  const entries = data.metaobjects.edges
  if (entries.length === 0) {
    console.log(`No metaobject entries found for type="${TYPE_HANDLE}".`)
    return
  }
  console.log(`Found ${entries.length} entries:`)
  for (const { node } of entries) {
    console.log(`\n  handle: ${node.handle}   (id=${node.id})`)
    console.log(`  displayName: ${node.displayName}`)
    for (const f of node.fields) {
      const val = f.value === null ? '(null)' : f.value.length > 80 ? f.value.slice(0, 80) + '…' : f.value
      console.log(`    ${f.key} = ${val}`)
    }
  }
}

async function read(handle) {
  const data = await gql(`
    query GetByHandle($handle: MetaobjectHandleInput!) {
      metaobjectByHandle(handle: $handle) {
        id
        handle
        displayName
        type
        fields { key value type }
      }
    }
  `, { handle: { type: TYPE_HANDLE, handle } })
  const m = data.metaobjectByHandle
  if (!m) {
    console.log(`No metaobject entry with handle="${handle}" for type="${TYPE_HANDLE}".`)
    return
  }
  console.log(`Entry: ${m.handle}   (id=${m.id})`)
  console.log(`displayName: ${m.displayName}`)
  console.log('Fields:')
  for (const f of m.fields) {
    console.log(`  ${f.key}  (${f.type})`)
    console.log(`    value: ${f.value === null ? '(null)' : f.value}`)
  }
}

function parseFields(args) {
  const fields = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--field' && args[i + 1]) {
      const eq = args[i + 1].indexOf('=')
      if (eq < 1) throw new Error(`Bad --field arg: ${args[i + 1]} (expected key=value)`)
      fields.push({ key: args[i + 1].slice(0, eq), value: args[i + 1].slice(eq + 1) })
      i++
    }
  }
  return fields
}

function parseFlag(args, name) {
  const prefix = `--${name}=`
  const arg = args.find(a => a.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : null
}

async function create(args) {
  const handle = parseFlag(args, 'handle')
  if (!handle) throw new Error('--handle=<value> is required')
  const fields = parseFields(args)
  const data = await gql(`
    mutation Create($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject { id handle displayName fields { key value } }
        userErrors { field message code }
      }
    }
  `, {
    metaobject: {
      type: TYPE_HANDLE,
      handle,
      fields,
    },
  })
  if (data.metaobjectCreate.userErrors.length) {
    console.error('userErrors:', JSON.stringify(data.metaobjectCreate.userErrors, null, 2))
    process.exit(1)
  }
  console.log('Created:')
  console.log(JSON.stringify(data.metaobjectCreate.metaobject, null, 2))
}

async function update(handle, args) {
  if (!handle) throw new Error('handle argument is required: update <handle> --field key=value ...')
  const fields = parseFields(args)
  if (fields.length === 0) throw new Error('at least one --field key=value required')
  // Fetch id by handle first
  const gotten = await gql(`
    query GetByHandle($handle: MetaobjectHandleInput!) {
      metaobjectByHandle(handle: $handle) { id }
    }
  `, { handle: { type: TYPE_HANDLE, handle } })
  if (!gotten.metaobjectByHandle) throw new Error(`No entry with handle=${handle}`)
  const id = gotten.metaobjectByHandle.id
  const data = await gql(`
    mutation Update($id: ID!, $metaobject: MetaobjectUpdateInput!) {
      metaobjectUpdate(id: $id, metaobject: $metaobject) {
        metaobject { id handle displayName fields { key value } }
        userErrors { field message code }
      }
    }
  `, { id, metaobject: { fields } })
  if (data.metaobjectUpdate.userErrors.length) {
    console.error('userErrors:', JSON.stringify(data.metaobjectUpdate.userErrors, null, 2))
    process.exit(1)
  }
  console.log('Updated:')
  console.log(JSON.stringify(data.metaobjectUpdate.metaobject, null, 2))
}

async function main() {
  const [, , cmd, ...rest] = process.argv
  try {
    switch (cmd) {
      case 'describe': await describe(); break
      case 'list':     await list(); break
      case 'read':     await read(rest[0]); break
      case 'create':   await create(rest); break
      case 'update':   await update(rest[0], rest.slice(1)); break
      default:
        console.log('Usage:')
        console.log('  node --env-file=.env.local scripts/metaobjects.mjs describe')
        console.log('  node --env-file=.env.local scripts/metaobjects.mjs list')
        console.log('  node --env-file=.env.local scripts/metaobjects.mjs read <handle>')
        console.log('  node --env-file=.env.local scripts/metaobjects.mjs create --handle=<h> [--field key=value ...]')
        console.log('  node --env-file=.env.local scripts/metaobjects.mjs update <handle> [--field key=value ...]')
        process.exit(1)
    }
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

main()
