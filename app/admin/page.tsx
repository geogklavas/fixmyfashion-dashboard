import { Fragment } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getOrders, thisMonthCount } from '@/lib/data'
import { ShopifyDiagnostic } from '@/components/dashboard/ShopifyDiagnostic'
import { BrandConfigDiagnostic } from '@/components/dashboard/BrandConfigDiagnostic'
import { BrandChecklistRow } from '@/components/dashboard/BrandChecklistRow'
import { ImpersonateButton } from '@/components/dashboard/ImpersonateButton'

export const dynamic = 'force-dynamic'

type BrandRow = {
  brand_handle: string
  brand_name: string
  brand_email: string
  last_login_at: string | null
  role: string | null
  launch_footer_done: boolean | null
  launch_email_done: boolean | null
  launch_packaging_done: boolean | null
  next_review_date: string | null
}

type CategoryRequest = {
  id: string
  brand_handle: string
  requested_categories: string
  status: string
  created_at: string
}

async function logout() {
  'use server'
  const { cookies } = await import('next/headers')
  const store = await cookies()
  store.delete('fmf_session')
  redirect('/login')
}

export default async function AdminPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')

  const sb = supabaseAdmin()
  const { data: brands } = await sb
    .from('brand_sessions')
    .select(
      'brand_handle, brand_name, brand_email, last_login_at, role, launch_footer_done, launch_email_done, launch_packaging_done, next_review_date',
    )
    .order('brand_name', { ascending: true })

  const { data: requests } = await sb
    .from('category_change_requests')
    .select('id, brand_handle, requested_categories, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const brandList = ((brands ?? []) as BrandRow[]).filter((b) => b.role !== 'admin')

  const brandStats = await Promise.all(
    brandList.map(async (b) => {
      const orders = await getOrders(b.brand_handle)
      return {
        handle: b.brand_handle,
        name: b.brand_name,
        email: b.brand_email,
        lastLogin: b.last_login_at,
        totalRepairs: orders.length,
        thisMonth: thisMonthCount(orders),
        checklist: {
          brandHandle: b.brand_handle,
          footerDone: !!b.launch_footer_done,
          emailDone: !!b.launch_email_done,
          packagingDone: !!b.launch_packaging_done,
          nextReviewDate: b.next_review_date ?? null,
        },
      }
    }),
  )

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <header className="bg-[#1a1a1a] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-gray-400">FixMyFashion</div>
          <div className="text-base font-semibold">Superadmin</div>
        </div>
        <form action={logout}>
          <button className="text-xs text-gray-300 hover:text-white">Log out</button>
        </form>
      </header>

      <main className="max-w-[1200px] mx-auto p-6 space-y-8">
        <section className="bg-white border border-black/10 rounded-xl p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[#1a1a1a]">Shopify connection</div>
            <div className="text-xs text-gray-500">
              Install the Shopify app once to get a live Admin API token. Paste the token into Vercel as{' '}
              <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">SHOPIFY_ADMIN_ACCESS_TOKEN</code> and redeploy.
            </div>
          </div>
          <a
            href="/api/shopify/install?shop=4xps3i-gg"
            className="px-4 py-2 rounded-lg bg-[#0F6E56] text-white text-sm font-medium hover:bg-[#0c5c48]"
          >
            Connect Shopify
          </a>
        </section>

        <ShopifyDiagnostic />
        <BrandConfigDiagnostic />

        <section>
          <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">All brands</h1>
          <p className="text-sm text-gray-500 mb-4">
            {brandStats.length} brand(s) active. Toggle launch checklist + set next review date inline.
          </p>
          <div className="bg-white border border-black/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Brand</th>
                  <th className="text-right px-4 py-2.5 font-medium">Repairs</th>
                  <th className="text-right px-4 py-2.5 font-medium">This month</th>
                  <th className="text-left px-4 py-2.5 font-medium">Last login</th>
                  <th className="text-left px-4 py-2.5 font-medium w-[1%] whitespace-nowrap">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {brandStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      No brands yet.
                    </td>
                  </tr>
                )}
                {brandStats.map((b) => (
                  <Fragment key={b.handle}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#1a1a1a]">{b.name}</div>
                        <div className="text-xs text-gray-500">{b.email}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{b.totalRepairs}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{b.thisMonth}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {b.lastLogin ? new Date(b.lastLogin).toLocaleDateString('en-GB') : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ImpersonateButton brandHandle={b.handle} />
                      </td>
                    </tr>
                    <tr className="bg-gray-50/40">
                      <td colSpan={5} className="px-4 py-2">
                        <BrandChecklistRow initial={b.checklist} />
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1a1a1a] mb-1">Category change requests</h2>
          <p className="text-sm text-gray-500 mb-4">
            {requests?.length ?? 0} pending request(s). Apply approved changes manually in Shopify BrandConfig.
          </p>
          <div className="bg-white border border-black/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Brand</th>
                  <th className="text-left px-4 py-2.5 font-medium">Requested categories</th>
                  <th className="text-left px-4 py-2.5 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {(requests ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-gray-400">
                      No pending requests.
                    </td>
                  </tr>
                )}
                {((requests ?? []) as CategoryRequest[]).map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">{r.brand_handle}</td>
                    <td className="px-4 py-3 text-gray-700">{r.requested_categories}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
