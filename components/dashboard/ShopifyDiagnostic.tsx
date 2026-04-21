'use client'

import { useState } from 'react'

type Diagnostic = {
  shop: string
  orderCount: number
  allTags: { tag: string; count: number }[]
  orders: { name: string; createdAt: string; tags: string[]; status: string }[]
}

export function ShopifyDiagnostic() {
  const [data, setData] = useState<Diagnostic | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/shopify-diagnostic', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `HTTP ${res.status}`)
        setLoading(false)
        return
      }
      setData((await res.json()) as Diagnostic)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-black/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-medium text-[#1a1a1a]">Shopify tag diagnostic</div>
          <div className="text-xs text-gray-500">
            Fetches the 50 most recent orders in the store to check what tags are actually applied.
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? 'Running…' : data ? 'Refresh' : 'Run diagnostic'}
        </button>
      </div>

      {error && <div className="text-xs text-red-600 mb-2">Error: {error}</div>}

      {data && (
        <div className="space-y-4 mt-3">
          <div className="text-xs text-gray-500">
            Shop: <code className="bg-gray-100 px-1 py-0.5 rounded">{data.shop}</code> · {data.orderCount} recent orders
          </div>

          <div>
            <div className="text-xs font-medium text-gray-700 mb-1">All tags found (sorted by frequency):</div>
            {data.allTags.length === 0 ? (
              <div className="text-xs text-gray-400">No tags on any recent order.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.allTags.map(({ tag, count }) => {
                  const isRepairTag = tag.startsWith('repair-')
                  const isBrandTag = tag.toLowerCase().includes('becasual')
                  return (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                        isBrandTag
                          ? 'bg-[#E1F5EE] text-[#0F6E56] font-medium'
                          : isRepairTag
                          ? 'bg-[#E6F1FB] text-[#185FA5]'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <code>{tag}</code>
                      <span className="text-gray-400">×{count}</span>
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              Show individual orders ({data.orders.length})
            </summary>
            <div className="mt-2 border border-black/10 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium">Order</th>
                    <th className="text-left px-2 py-1.5 font-medium">Date</th>
                    <th className="text-left px-2 py-1.5 font-medium">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {data.orders.map((o) => (
                    <tr key={o.name}>
                      <td className="px-2 py-1.5 font-mono text-[11px]">{o.name}</td>
                      <td className="px-2 py-1.5 text-gray-500">
                        {new Date(o.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-2 py-1.5 text-gray-700">
                        {o.tags.length === 0 ? <span className="text-gray-400">—</span> : o.tags.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
