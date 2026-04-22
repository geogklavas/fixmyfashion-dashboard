import { JOB_CATEGORY_COLORS } from '@/lib/data'

type Row = { category: string; label: string; count: number; share: number }

export function CategoryRankedCards({ data }: { data: Row[] }) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return <div className="text-xs text-gray-400 text-center py-6">No classified orders yet.</div>
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {data.map((d) => {
        const color = JOB_CATEGORY_COLORS[d.category] ?? '#B8BAC0'
        return (
          <div key={d.category} className="border border-black/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
              <div className="text-xs uppercase tracking-wide text-gray-500">{d.label}</div>
            </div>
            <div className="text-2xl font-semibold text-[#1a1a1a]">{d.count}</div>
            <div className="text-xs text-gray-500 mb-2">{d.share}% of classified</div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full" style={{ width: `${Math.min(100, d.share)}%`, background: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
