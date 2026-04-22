import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getBrandConfigDiagnostic } from '@/lib/shopify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Returns the raw metaobject fields for the brand_config matching `brand`,
// the list of all brand_handle values found, and the parsed config the app
// would render. Used to debug allowed_categories showing stale/wrong data.
export async function GET(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'admin_only' }, { status: 403 })
  }

  const url = new URL(req.url)
  const brand = url.searchParams.get('brand') ?? 'becasual'

  if (!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || !process.env.SHOPIFY_STORE_DOMAIN) {
    return NextResponse.json({ error: 'shopify_env_missing' }, { status: 500 })
  }

  try {
    const diag = await getBrandConfigDiagnostic(brand)
    return NextResponse.json({ brand, ...diag })
  } catch (err) {
    return NextResponse.json({ error: 'shopify_error', message: (err as Error).message }, { status: 500 })
  }
}
