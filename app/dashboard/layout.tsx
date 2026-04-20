import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getConfig, isUsingMockData } from '@/lib/data'
import { Header } from '@/components/dashboard/Header'
import { TabNav } from '@/components/dashboard/TabNav'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const config = await getConfig(session.brandHandle)
  const primary = config.primaryColor || '#0F6E56'

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <Header brandName={config.brandName} primaryColor={primary} />
      <TabNav primaryColor={primary} />
      {isUsingMockData() && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs px-6 py-2">
          Demo data — connect Shopify Admin API to see live repair orders.
        </div>
      )}
      <main className="max-w-[1200px] mx-auto p-6">{children}</main>
    </div>
  )
}
