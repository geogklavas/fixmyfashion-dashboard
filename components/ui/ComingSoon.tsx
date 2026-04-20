export function ComingSoon({ title, sprint }: { title: string; sprint: string }) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">{title}</h1>
      <p className="text-sm text-gray-500 mb-6">Coming in {sprint}.</p>
      <div className="bg-white border border-dashed border-black/15 rounded-xl p-10 text-center text-sm text-gray-400">
        This tab is under construction.
      </div>
    </div>
  )
}
