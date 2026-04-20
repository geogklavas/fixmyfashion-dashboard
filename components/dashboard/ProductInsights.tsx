export function ProductInsights({
  items,
}: {
  items: { garment: string; repair: string; count: number; share: number }[]
}) {
  if (items.length === 0) {
    return <div className="text-sm text-gray-400">No data yet.</div>
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={`${item.garment}-${item.repair}`}
          className="bg-white border border-black/10 rounded-xl p-4"
        >
          <div className="text-[10px] uppercase tracking-wider text-gray-500">{item.garment}</div>
          <div className="mt-1 text-sm font-semibold text-[#1a1a1a]">{item.repair} failure</div>
          <div className="mt-2 text-xs text-gray-500">
            {item.count} repairs · {item.share}% of total
          </div>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0F6E56]" style={{ width: `${Math.min(100, item.share)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
