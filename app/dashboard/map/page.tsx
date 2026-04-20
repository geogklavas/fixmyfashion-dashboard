import { getSession } from '@/lib/auth'
import { getOrders, cityCounts, regionBreakdown, pickupMethodByMonth } from '@/lib/data'
import { mockCityFor } from '@/lib/mock'
import { GreeceMap } from '@/components/dashboard/GreeceMap'
import { PickupMethodChart } from '@/components/charts/PickupMethodChart'

export const dynamic = 'force-dynamic'

export default async function MapPage() {
  const session = await getSession()
  const orders = await getOrders(session!.brandHandle)

  // Stage 1: parse city from shippingAddress when available, else mock.
  // (Shopify Admin API does return shippingAddress.city but our getBrandOrders doesn't fetch it yet.)
  const cities = cityCounts(orders, (i) => mockCityFor(i))
  const regions = regionBreakdown(cities)
  const pickup = pickupMethodByMonth(orders)

  const pct = (n: number) => (regions.total === 0 ? 0 : Math.round((n / regions.total) * 100))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">Map</h1>
        <p className="text-sm text-gray-500">Geographic distribution of repair pickups.</p>
      </div>

      <section className="bg-white border border-black/10 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Repair locations</h3>
        <GreeceMap pins={cities} total={orders.length} />
      </section>

      <section className="grid grid-cols-3 gap-4">
        <RegionStat label="Attica" value={`${pct(regions.attica)}%`} sub={`${regions.attica.toLocaleString()} repairs`} />
        <RegionStat
          label="Central Macedonia"
          value={`${pct(regions.centralMacedonia)}%`}
          sub={`${regions.centralMacedonia.toLocaleString()} repairs`}
        />
        <RegionStat label="Rest of Greece" value={`${pct(regions.rest)}%`} sub={`${regions.rest.toLocaleString()} repairs`} />
      </section>

      <section className="bg-white border border-black/10 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-1">Pickup method</h3>
        <p className="text-xs text-gray-500 mb-3">Based on available logistics data.</p>
        <PickupMethodChart data={pickup} />
      </section>
    </div>
  )
}

function RegionStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-black/10 rounded-xl p-4 text-center">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[#1a1a1a]">{value}</div>
      <div className="text-xs text-gray-500">{sub}</div>
    </div>
  )
}
