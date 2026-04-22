import { getSession } from '@/lib/auth'
import {
  getOrders,
  classifiedOrderCount,
  categoryCardData,
  categoryOrderCount,
  repairTypeBreakdown,
  alterationTypeBreakdown,
  turnaroundDistribution,
  monthlyByCategory,
  averageTurnaroundDays,
  deliveredWithinDays,
  repeatCustomerRate,
  regionBreakdown,
  sustainabilityTotals,
  completedCount,
} from '@/lib/data'
import { KpiCard } from '@/components/ui/KpiCard'
import { CategoryRankedCards } from '@/components/dashboard/CategoryRankedCards'
import { TypeRankedList } from '@/components/dashboard/TypeRankedList'
import { TurnaroundBarChart } from '@/components/charts/TurnaroundBarChart'
import { MonthlyStackedBarChart } from '@/components/charts/MonthlyStackedBarChart'

export const dynamic = 'force-dynamic'

const CATEGORY_GATE = 10
const TYPE_GATE = 5
const MONTHLY_STACK_GATE = 50

export default async function AnalyticsPage() {
  const session = await getSession()
  const orders = await getOrders(session!.brandHandle)

  const categories = categoryCardData(orders)
  const classified = classifiedOrderCount(orders)
  const repairTypes = repairTypeBreakdown(orders)
  const alterTypes = alterationTypeBreakdown(orders)
  const repairCount = categoryOrderCount(orders, 'repair')
  const alterCount = categoryOrderCount(orders, 'alteration')

  const turnaround = turnaroundDistribution(orders)
  const stacked = monthlyByCategory(orders)
  const avgDays = averageTurnaroundDays(orders)
  const sevenDay = deliveredWithinDays(orders, 7)
  const repeat = repeatCustomerRate(orders)
  const rerepair = sustainabilityTotals(orders).rerepairRate
  const regions = regionBreakdown(orders)
  const fulfilledTotal = completedCount(orders)

  const maxMonthlyTotal = Math.max(
    0,
    ...stacked.map((row) =>
      Object.entries(row).reduce(
        (sum, [k, v]) => (k === 'month' ? sum : sum + (typeof v === 'number' ? v : 0)),
        0,
      ),
    ),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">Analytics</h1>
        <p className="text-sm text-gray-500">Service mix, turnaround, and customer behaviour.</p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Repeat repair customers"
          value={`${repeat.pct}%`}
          sub={
            repeat.unique > 0
              ? `${repeat.repeaters} of ${repeat.unique} unique customers`
              : 'No Fulfilled orders yet'
          }
          subTone={repeat.pct >= 20 ? 'positive' : 'neutral'}
        />
        <KpiCard label="Re-repair rate" value={`${rerepair}%`} sub="Lower is better" />
        <KpiCard
          label="Delivered within 7 days"
          value={`${sevenDay.pct}%`}
          sub={
            sevenDay.total > 0
              ? `${sevenDay.hits} of ${sevenDay.total} repairs`
              : 'Awaiting Fulfilled orders'
          }
          subTone={sevenDay.pct < 80 && sevenDay.total > 0 ? 'negative' : 'positive'}
        />
      </section>

      <section className="bg-white border border-black/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Service category</h3>
          <span className="text-[11px] text-gray-400">{classified} classified</span>
        </div>
        {classified < CATEGORY_GATE ? (
          <div className="text-xs text-gray-400 py-6 text-center">
            Service mix available from {CATEGORY_GATE} classified orders. ({classified}/{CATEGORY_GATE})
          </div>
        ) : (
          <CategoryRankedCards data={categories} />
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-black/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Repair types</h3>
            <span className="text-[11px] text-gray-400">{repairCount} repair orders</span>
          </div>
          {repairCount < TYPE_GATE ? (
            <div className="text-xs text-gray-400 py-6 text-center">
              Repair type breakdown available from {TYPE_GATE} repair orders. ({repairCount}/{TYPE_GATE})
            </div>
          ) : (
            <TypeRankedList data={repairTypes} color="#0F6E56" />
          )}
        </div>
        <div className="bg-white border border-black/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Alteration types</h3>
            <span className="text-[11px] text-gray-400">{alterCount} alteration orders</span>
          </div>
          {alterCount < TYPE_GATE ? (
            <div className="text-xs text-gray-400 py-6 text-center">
              Alteration breakdown available from {TYPE_GATE} alteration orders. ({alterCount}/{TYPE_GATE})
            </div>
          ) : (
            <TypeRankedList data={alterTypes} color="#185FA5" />
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-black/10 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Turnaround distribution</h3>
          <TurnaroundBarChart data={turnaround} />
          <div className="mt-3 text-xs text-gray-500">
            Avg {avgDays > 0 ? `${avgDays} days` : '—'} · Target: 7 days · {sevenDay.pct}% delivered within 7 days
          </div>
        </div>
        <div className="bg-white border border-black/10 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Monthly volume by service</h3>
          {maxMonthlyTotal < MONTHLY_STACK_GATE ? (
            <div className="text-xs text-gray-400 py-10 text-center">
              Monthly breakdown available once a month reaches {MONTHLY_STACK_GATE}+ repairs. (peak: {maxMonthlyTotal})
            </div>
          ) : (
            <MonthlyStackedBarChart data={stacked} />
          )}
        </div>
      </section>

      <section className="bg-white border border-black/10 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Where repairs come from</h3>
        {regions.total === 0 ? (
          <div className="text-xs text-gray-400 py-6 text-center">
            Regional stats appear once Fulfilled orders include shipping addresses.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <RegionStat label="Attica" value={regions.attica} total={regions.total} />
            <RegionStat label="Central Macedonia" value={regions.centralMacedonia} total={regions.total} />
            <RegionStat label="Rest of Greece" value={regions.rest} total={regions.total} />
          </div>
        )}
        <div className="text-xs text-gray-400 mt-3">
          Based on {regions.total} order(s) with a shipping city · {fulfilledTotal} Fulfilled total.
        </div>
      </section>
    </div>
  )
}

function RegionStat({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div className="text-center">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[#1a1a1a]">{pct}%</div>
      <div className="text-xs text-gray-500">
        {value} repair{value === 1 ? '' : 's'}
      </div>
    </div>
  )
}
