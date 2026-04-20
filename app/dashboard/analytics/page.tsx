import { getSession } from '@/lib/auth'
import {
  getOrders,
  repairTypeBreakdown,
  turnaroundDistribution,
  monthlyByType,
  productInsights,
  averageTurnaroundDays,
  onTimeRate,
} from '@/lib/data'
import { RepairTypeDonut } from '@/components/charts/RepairTypeDonut'
import { TurnaroundBarChart } from '@/components/charts/TurnaroundBarChart'
import { MonthlyStackedBarChart } from '@/components/charts/MonthlyStackedBarChart'
import { ProductInsights } from '@/components/dashboard/ProductInsights'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const session = await getSession()
  const orders = await getOrders(session!.brandHandle)

  const donut = repairTypeBreakdown(orders)
  const turnaround = turnaroundDistribution(orders)
  const stacked = monthlyByType(orders)
  const insights = productInsights(orders)
  const avgDays = averageTurnaroundDays(orders)
  const onTime = onTimeRate(orders)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">Analytics</h1>
        <p className="text-sm text-gray-500">Repair type mix, turnaround, and product-level insights.</p>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-black/10 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Repair type breakdown</h3>
          <RepairTypeDonut data={donut} />
        </div>
        <div className="bg-white border border-black/10 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Turnaround distribution</h3>
          <TurnaroundBarChart data={turnaround} />
          <div className="mt-3 text-xs text-gray-500">
            Avg {avgDays > 0 ? `${avgDays} days` : '—'} · SLA: 10 days · {onTime}% on-time
          </div>
        </div>
      </section>

      <section className="bg-white border border-black/10 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Monthly volume by repair type</h3>
        <MonthlyStackedBarChart data={stacked} />
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-700">Product insights</h2>
        <p className="text-xs text-gray-500 mb-3">
          Which garment-repair combinations appear most — useful for product design decisions.
        </p>
        <ProductInsights items={insights} />
      </section>
    </div>
  )
}
