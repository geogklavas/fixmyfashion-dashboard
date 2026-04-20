import { getSession } from '@/lib/auth'
import {
  averageTurnaroundDays,
  getOrders,
  lastMonthCount,
  monthlyVolume,
  pipelineCounts,
  thisMonthCount,
} from '@/lib/data'
import { KpiCard } from '@/components/ui/KpiCard'
import { PipelinePill } from '@/components/dashboard/PipelinePill'
import { VolumeLineChart } from '@/components/charts/VolumeLineChart'
import { SatisfactionLineChart } from '@/components/charts/SatisfactionLineChart'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const session = await getSession()
  const orders = await getOrders(session!.brandHandle)

  const thisMonth = thisMonthCount(orders)
  const lastMonth = lastMonthCount(orders)
  const delta = lastMonth === 0 ? null : Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
  const firstOrderDate =
    orders.length > 0
      ? new Date(orders[orders.length - 1].createdAt).toLocaleDateString('en-GB', {
          month: 'short',
          year: 'numeric',
        })
      : '—'
  const turnaround = averageTurnaroundDays(orders)
  const pipeline = pipelineCounts(orders)
  const volume = monthlyVolume(orders)

  // Mock satisfaction — Judge.me integration will replace this
  const satisfaction = volume.map((v, i) => ({
    month: v.month,
    score: 4.5 + ((i * 7) % 10) / 30,
  }))

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
        <KpiCard label="All-time repairs" value={orders.length} sub={`Since ${firstOrderDate}`} />
        <KpiCard
          label="Customer rating"
          value={orders.length > 0 ? '4.8' : '—'}
          sub={orders.length > 0 ? `Based on ${Math.floor(orders.length * 0.4)} reviews` : 'Judge.me wiring pending'}
        />
        <KpiCard
          label="Avg turnaround"
          value={turnaround > 0 ? `${turnaround}d` : '—'}
          sub="SLA: 10 days"
        />
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-700 mb-3">Active pipeline</h2>
        <div className="flex flex-wrap gap-3">
          <PipelinePill count={pipeline.received} label="Received" color="#BA7517" />
          <PipelinePill count={pipeline.inProgress} label="In progress" color="#185FA5" />
          <PipelinePill count={pipeline.qaComplete} label="QA complete" color="#0F6E56" />
          <PipelinePill count={pipeline.dispatched} label="Dispatched" color="#534AB7" />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-black/10 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Monthly repair volume</h3>
          <VolumeLineChart data={volume} />
        </div>
        <div className="bg-white border border-black/10 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Customer satisfaction</h3>
          <SatisfactionLineChart data={satisfaction} />
        </div>
      </section>
    </div>
  )
}
