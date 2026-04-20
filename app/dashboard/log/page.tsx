import { getSession } from '@/lib/auth'
import { getOrders } from '@/lib/data'
import { detectStatus } from '@/lib/shopify'
import { RepairLogTable, type LogRow } from '@/components/dashboard/RepairLogTable'

export const dynamic = 'force-dynamic'

export default async function LogPage() {
  const session = await getSession()
  const orders = await getOrders(session!.brandHandle)

  const rows: LogRow[] = orders.map((o) => {
    const firstItem = o.lineItems[0]
    return {
      id: o.id,
      orderName: o.name,
      createdAt: o.createdAt,
      status: detectStatus(o.tags),
      productTitle: firstItem?.title ?? 'Repair',
      price: firstItem?.price.amount ?? '0',
    }
  })

  return (
    <div>
      <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">Repair log</h1>
      <p className="text-sm text-gray-500 mb-4">All repairs processed for your brand.</p>
      <RepairLogTable rows={rows} />
    </div>
  )
}
