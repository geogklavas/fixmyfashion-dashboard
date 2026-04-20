import { getSession } from '@/lib/auth'
import { getConfig, getOrders, sustainabilityTotals, cumulativeCO2ByMonth } from '@/lib/data'
import { KpiCard } from '@/components/ui/KpiCard'
import { CO2BarChart } from '@/components/charts/CO2BarChart'
import { SustainabilityBadge } from '@/components/dashboard/SustainabilityBadge'

export const dynamic = 'force-dynamic'

function formatWater(litres: number): string {
  if (litres >= 1_000_000) return `${(litres / 1_000_000).toFixed(1)}M`
  if (litres >= 1_000) return `${Math.round(litres / 1_000)}K`
  return String(litres)
}

export default async function SustainabilityPage() {
  const session = await getSession()
  const [orders, config] = await Promise.all([
    getOrders(session!.brandHandle),
    getConfig(session!.brandHandle),
  ])

  const totals = sustainabilityTotals(orders)
  const cumulative = cumulativeCO2ByMonth(orders)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">Sustainability</h1>
        <p className="text-sm text-gray-500">Environmental impact of your repair programme.</p>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="🌿 CO₂ saved" value={`${totals.co2Kg.toLocaleString()} kg`} sub="vs replacement" />
        <KpiCard label="👕 Garments repaired" value={totals.completed.toLocaleString()} sub="Delivered to customer" />
        <KpiCard label="💧 Water saved" value={`${formatWater(totals.waterL)} L`} sub="production avoided" />
        <KpiCard label="📉 Re-repair rate" value={`${totals.rerepairRate}%`} sub="Lower is better" />
      </section>

      <p className="text-xs text-gray-500 leading-relaxed max-w-3xl">
        Estimates based on standard industry benchmarks: approx. 3 kg CO₂ and 2,700 L water saved per garment repaired vs
        replaced.
      </p>

      <section className="bg-white border border-black/10 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Cumulative CO₂ saved</h3>
        <CO2BarChart data={cumulative} />
      </section>

      <SustainabilityBadge brandName={config.brandName} garments={totals.completed} co2Kg={totals.co2Kg} />
    </div>
  )
}
