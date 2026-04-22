'use client'

import { useState } from 'react'

type BrandConfigSnapshot = {
  brand: string
  matchedHandle: string | null
  candidateHandles: string[]
  rawFields: Record<string, string> | null
  parsedConfig: { allowedCategories?: string[]; portalUrl?: string; brandName?: string } | null
}

export function BrandConfigDiagnostic() {
  const [brand, setBrand] = useState('becasual')
  const [data, setData] = useState<BrandConfigSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/brandconfig-diagnostic?brand=${encodeURIComponent(brand)}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `HTTP ${res.status}`)
        setLoading(false)
        return
      }
      setData((await res.json()) as BrandConfigSnapshot)
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
          <div className="text-sm font-medium text-[#1a1a1a]">BrandConfig metaobject diagnostic</div>
          <div className="text-xs text-gray-500">
            Inspect what Shopify returns for a brand_handle and how the app parses it.
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="border border-black/10 rounded-lg px-2.5 py-1.5 text-sm bg-white"
            placeholder="brand handle"
          />
          <button
            onClick={run}
            disabled={loading || !brand}
            className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? 'Running…' : 'Inspect'}
          </button>
        </div>
      </div>

      {error && <div className="text-xs text-red-600 mb-2">Error: {error}</div>}

      {data && (
        <div className="space-y-3 mt-3 text-xs">
          <div>
            <span className="text-gray-500">Matched handle: </span>
            {data.matchedHandle ? (
              <code className="bg-[#E1F5EE] text-[#0F6E56] px-1.5 py-0.5 rounded">{data.matchedHandle}</code>
            ) : (
              <span className="text-red-600 font-medium">no match — falling back to mock</span>
            )}
          </div>

          <div>
            <span className="text-gray-500">Candidate handles in store: </span>
            <span className="text-gray-700">
              {data.candidateHandles.length > 0 ? data.candidateHandles.join(', ') : '(none)'}
            </span>
          </div>

          {data.rawFields && (
            <div>
              <div className="text-gray-500 mb-1">Raw metaobject fields:</div>
              <pre className="bg-gray-50 border border-black/5 rounded p-2 overflow-x-auto">
                {JSON.stringify(data.rawFields, null, 2)}
              </pre>
            </div>
          )}

          {data.parsedConfig && (
            <div>
              <div className="text-gray-500 mb-1">Parsed BrandConfig:</div>
              <pre className="bg-gray-50 border border-black/5 rounded p-2 overflow-x-auto">
                {JSON.stringify(data.parsedConfig, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
