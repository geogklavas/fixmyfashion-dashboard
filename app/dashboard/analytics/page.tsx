import { getSession } from '@/lib/auth'
import {
  getOrders,
  jobCategoryBreakdown,
  jobTypeBreakdown,
  classifiedOrderCount,
  turnaroundDistribution,
  monthlyByCategory,
  productInsights,
  averageTurnaroundDays,
  deliveredWithinDays,
} from '@/lib/data'
import { ServiceBreakdownDonut } from '@/components/charts/ServiceBreakdownDonut'
import { TurnaroundBarChart } from '@/components/charts/TurnaroundBarChart'
import { MonthlyStackedBarChart } from '@/components/charts/MonthlyStackedBarChart'
import { ProductInsights } from '@/components/dashboard/ProductInsights'

export const dynamic = 'force-dynamic'

const CLASSIFICATION_GATE = 10

export default async function AnalyticsPage() {
  const session = await getSession()
  const orders = await getOrders(session!.brandHandle)

  const categories = jobCategoryBreakdown(orders)
  const types = jobTypeBreakdown(orders)
  const classified = classifiedOrderCount(orders)
  const turnaround = turnaroundDistribution(orders)
  const stacked = monthlyByCategory(orders)
  const insights = productInsights(orders)
  const avgDays = averageTurnaroundDays(orders)
  const sevenDay = deliveredWithinDays(orders, 7)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">Analytics</h1>
        <p className="text-sm text-gray-500">Service mix, turnaround, and product-level insights.</p>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-black/10 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Service breakdown</h3>
          {classified < CLASSIFICATION_GATE ? (
            <div className="text-xs text-gray-400 py-10 text-center">
              Repair mix available from {CLASSIFICATION_GATE} classified orders. ({classified}/{CLASSIFICATION_GATE})
            </div>
          ) : (
            <ServiceBreakdownDonut categories={categories} types={types} />
          )}
        </div>
        <div className="bg-white border border-black/10 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Turnaround distribution</h3>
          <TurnaroundBarChart data={turnaround} />
          <div className="mt-3 text-xs text-gray-500">
            Avg {avgDays > 0 ? `${avgDays} days` : '—'} · Target: 7 days · {sevenDay.pct}% delivered within 7 days
          </div>
        </div>
      </section>

      <section className="bg-white border border-black/10 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Monthly volume by service</h3>
        <MonthlyStackedBarChart data={stacked} />
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-700">Product insights</h2>
        <p className="text-xs text-gray-500 mb-3">
          Which garment × service combinations appear most — useful for product design decisions.
        </p>
        <ProductInsights items={insights} />
      </section>
    </div>
  )
}
