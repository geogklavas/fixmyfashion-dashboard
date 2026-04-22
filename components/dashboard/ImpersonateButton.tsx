'use client'

import { useState } from 'react'

export function ImpersonateButton({ brandHandle }: { brandHandle: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go() {
    setError(null)
    setPending(true)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandHandle }),
      })
      const body = (await res.json().catch(() => ({}))) as { redirect?: string; error?: string }
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`)
        setPending(false)
        return
      }
      window.location.href = body.redirect ?? '/dashboard/overview'
    } catch (err) {
      setError((err as Error).message)
      setPending(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={go}
        disabled={pending}
        className="text-xs text-[#0F6E56] hover:underline disabled:opacity-50"
      >
        {pending ? 'Loading…' : 'View as →'}
      </button>
      {error && <span className="text-[10px] text-red-600">{error}</span>}
    </div>
  )
}
