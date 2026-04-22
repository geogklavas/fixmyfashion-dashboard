import { getSession } from '@/lib/auth'
import { getConfig, getOrders } from '@/lib/data'
import { detectStatus } from '@/lib/shopify'
import { RepairLogTable, type LogRow } from '@/components/dashboard/RepairLogTable'
import { NoRepairsYet } from '@/components/dashboard/NoRepairsYet'

export const dynamic = 'force-dynamic'

export default async function LogPage() {
  const session = await getSession()
  const [orders, config] = await Promise.all([
    getOrders(session!.brandHandle),
    getConfig(session!.brandHandle),
  ])

  const rows: LogRow[] = orders.map((o) => {
    const firstItem = o.lineItems[0]
    return {
      id: o.id,
      orderName: o.name,
      createdAt: o.createdAt,
      status: detectStatus(o),
      productTitle: firstItem?.title ?? 'Repair',
      price: firstItem?.price.amount ?? '0',
      fulfilledAt: o.fulfillments[0]?.createdAt ?? null,
    }
  })

  return (
    <div>
      <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">Repair log</h1>
      <p className="text-sm text-gray-500 mb-4">All repairs processed for your brand.</p>
      {rows.length === 0 ? <NoRepairsYet portalUrl={config.portalUrl} /> : <RepairLogTable rows={rows} />}
    </div>
  )
}
