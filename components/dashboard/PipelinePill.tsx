export function PipelinePill({
  count,
  label,
  color,
}: {
  count: number
  label: string
  color: string
}) {
  return (
    <div className="bg-white border border-black/10 rounded-xl p-4 flex-1 min-w-[140px]">
      <div className="text-3xl font-semibold" style={{ color }}>
        {count}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}
