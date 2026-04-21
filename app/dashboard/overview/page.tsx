import { getSession } from '@/lib/auth'
import {
  averageTurnaroundDays,
  completedCount,
  fulfilledOrders,
  getOrders,
  lastMonthCount,
  monthlyVolume,
  pipelineCounts,
  thisMonthCount,
} from '@/lib/data'
import { KpiCard } from '@/components/ui/KpiCard'
import { PipelinePill } from '@/components/dashboard/PipelinePill'
import { VolumeLineChart } from '@/components/charts/VolumeLineChart'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const session = await getSession()
  const orders = await getOrders(session!.brandHandle)

  const thisMonth = thisMonthCount(orders)
  const lastMonth = lastMonthCount(orders)
  const delta = lastMonth === 0 ? null : Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
  const completed = fulfilledOrders(orders)
  const firstOrderDate =
    completed.length > 0
      ? new Date(completed[completed.length - 1].createdAt).toLocaleDateString('en-GB', {
          month: 'short',
          year: 'numeric',
        })
      : '—'
  const turnaround = averageTurnaroundDays(orders)
  const pipeline = pipelineCounts(orders)
  const volume = monthlyVolume(orders)
  const allTime = completedCount(orders)

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Repairs this month"
          value={thisMonth}
          sub={
            delta == null
              ? 'First month tracked'
              : `${delta >= 0 ? '+' : ''}${delta}% vs last month`
          }
          subTone={delta == null ? 'neutral' : delta >= 0 ? 'positive' : 'negative'}
        />
        <KpiCard
          label="All-time repairs"
          value={allTime}
          sub={allTime > 0 ? `Since ${firstOrderDate}` : 'No Fulfilled orders yet'}
        />
        <KpiCard
          label="FMF service rating"
          value="—"
          sub="FixMyFashion service rating · Judge.me wiring pending"
        />
        <KpiCard
          label="Avg turnaround"
          value={turnaround > 0 ? `${turnaround}d` : '—'}
          sub="Target: 7 days"
        />
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-700 mb-3">Active pipeline</h2>
        <div className="flex flex-wrap gap-3">
          <PipelinePill count={pipeline.inWorkshop} label="In workshop" color="#185FA5" />
          <PipelinePill count={pipeline.returningRecently} label="Returning to customers" color="#0F6E56" />
        </div>
      </section>

      <section className="bg-white border border-black/10 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Monthly repair volume</h3>
        <VolumeLineChart data={volume} />
      </section>
    </div>
  )
}
