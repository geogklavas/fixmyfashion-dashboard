'use client'

import { useState } from 'react'

export function ImpersonationBanner({ brandName }: { brandName: string }) {
  const [exiting, setExiting] = useState(false)

  async function exit() {
    setExiting(true)
    try {
      const res = await fetch('/api/admin/impersonate/exit', { method: 'POST' })
      const body = (await res.json()) as { redirect?: string }
      window.location.href = body.redirect ?? '/admin'
    } catch {
      setExiting(false)
    }
  }

  return (
    <div className="bg-[#1a1a1a] text-white px-6 py-2 flex items-center justify-between text-xs">
      <div>
        <span className="text-gray-400 uppercase tracking-wider mr-2">Impersonating</span>
        <span className="font-medium">{brandName}</span>
        <span className="text-gray-500 ml-2">— viewing this brand&apos;s dashboard as admin</span>
      </div>
      <button
        onClick={exit}
        disabled={exiting}
        className="text-xs text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded disabled:opacity-50"
      >
        {exiting ? 'Exiting…' : 'Exit impersonation →'}
      </button>
    </div>
  )
}
