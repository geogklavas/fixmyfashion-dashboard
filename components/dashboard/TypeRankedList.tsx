type Row = { type: string; label: string; count: number; share: number }

export function TypeRankedList({ data, color }: { data: Row[]; color: string }) {
  if (data.length === 0) {
    return <div className="text-xs text-gray-400 text-center py-6">No data yet.</div>
  }
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.type}>
          <div className="flex items-baseline justify-between text-sm mb-1">
            <span className="text-[#1a1a1a]">{d.label}</span>
            <span className="text-xs text-gray-500 tabular-nums">
              {d.count} · {d.share}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full" style={{ width: `${Math.min(100, d.share)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
