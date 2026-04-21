import { getSession } from '@/lib/auth'
import {
  getOrders,
  thisMonthCount,
  averageTurnaroundDays,
  sustainabilityTotals,
} from '@/lib/data'
import { detectStatus } from '@/lib/shopify'
import { ReportDownloads } from '@/components/dashboard/ReportDownloads'
import type { LogRow } from '@/components/dashboard/RepairLogTable'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const session = await getSession()
  const orders = await getOrders(session!.brandHandle)

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

  const sustainability = sustainabilityTotals(orders)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">Reports</h1>
        <p className="text-sm text-gray-500">Downloadable reports and scheduled delivery.</p>
      </div>
      <ReportDownloads
        data={{
          brandName: session!.brandName,
          rows,
          thisMonth: thisMonthCount(orders),
          allTime: orders.length,
          avgTurnaround: averageTurnaroundDays(orders),
          co2Kg: sustainability.co2Kg,
          garments: sustainability.completed,
        }}
      />
    </div>
  )
}
