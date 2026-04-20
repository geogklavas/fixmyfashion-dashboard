'use client'

import { useState } from 'react'

const AVAILABLE_CATEGORIES = [
  'pants',
  'jackets',
  'shirts',
  'dresses',
  'skirts',
  'knitwear',
  'coats',
  'trousers',
  'jeans',
]

type Status = 'idle' | 'saving' | 'pending' | 'error'

export function CategoryToggles({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial))
  const [status, setStatus] = useState<Status>('idle')

  function toggle(cat: string) {
    const next = new Set(selected)
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    setSelected(next)
    setStatus('idle')
  }

  async function submitRequest() {
    setStatus('saving')
    try {
      const res = await fetch('/api/settings/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: Array.from(selected) }),
      })
      if (res.ok) setStatus('pending')
      else setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  const dirty = JSON.stringify([...selected].sort()) !== JSON.stringify([...initial].sort())

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {AVAILABLE_CATEGORIES.map((cat) => {
          const active = selected.has(cat)
          return (
            <button
              key={cat}
              onClick={() => toggle(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                active
                  ? 'bg-[#E1F5EE] border-[#0F6E56] text-[#0F6E56]'
                  : 'bg-white border-black/10 text-gray-500 hover:border-black/20'
              }`}
            >
              {cat}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={submitRequest}
          disabled={!dirty || status === 'saving' || status === 'pending'}
          className="px-4 py-2 rounded-lg bg-[#0F6E56] text-white text-sm font-medium hover:bg-[#0c5c48] disabled:opacity-40"
        >
          {status === 'saving' ? 'Sending…' : 'Request update'}
        </button>
        {status === 'pending' && (
          <span className="text-xs text-[#0F6E56]">Sent to FixMyFashion — changes active within 24h.</span>
        )}
        {status === 'error' && <span className="text-xs text-red-600">Something went wrong. Try again.</span>}
      </div>
    </div>
  )
}
