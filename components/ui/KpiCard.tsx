export function KpiCard({
  label,
  value,
  sub,
  subTone,
}: {
  label: string
  value: string | number
  sub?: string
  subTone?: 'positive' | 'neutral' | 'negative'
}) {
  const toneColor =
    subTone === 'positive' ? '#0F6E56' : subTone === 'negative' ? '#BA7517' : '#6b7280'
  return (
    <div className="bg-white border border-black/10 rounded-xl p-5">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-[#1a1a1a]">{value}</div>
      {sub && (
        <div className="mt-1 text-xs" style={{ color: toneColor }}>
          {sub}
        </div>
      )}
    </div>
  )
}
