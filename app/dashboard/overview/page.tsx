import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const session = await getSession()
  return (
    <main className="min-h-screen bg-[#f9fafb] p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <div className="text-xs uppercase tracking-wide text-gray-500">Repairs by FixMyFashion</div>
          <h1 className="text-2xl font-semibold text-[#1a1a1a]">{session?.brandName ?? 'Brand'}</h1>
        </header>
        <div className="bg-white border border-black/10 rounded-xl p-6 text-sm text-gray-600">
          Overview tab — KPIs and charts coming in Sprint 2.
        </div>
      </div>
    </main>
  )
}
