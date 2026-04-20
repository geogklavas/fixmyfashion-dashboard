'use client'

import { useState, type FormEvent } from 'react'

type Status = 'idle' | 'sending' | 'sent' | 'not_found' | 'error'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/auth/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStatus('sent')
      } else if (res.status === 404) {
        setStatus('not_found')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f9fafb] px-4">
      <div className="w-full max-w-sm bg-white border border-black/10 rounded-xl p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="text-[#0F6E56] font-semibold text-lg tracking-tight">FixMyFashion</div>
          <div className="text-xs text-gray-500 mt-1">Brand Admin Dashboard</div>
        </div>

        {status === 'sent' ? (
          <div className="text-sm text-gray-700 text-center leading-relaxed">
            Check your email — we&apos;ve sent a login link to <span className="font-medium">{email}</span>.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm text-gray-700">Work email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                placeholder="you@brand.com"
                disabled={status === 'sending'}
              />
            </label>
            <button
              type="submit"
              disabled={status === 'sending' || !email}
              className="w-full rounded-lg bg-[#0F6E56] text-white py-2.5 text-sm font-medium hover:bg-[#0c5c48] disabled:opacity-50 transition"
            >
              {status === 'sending' ? 'Sending…' : 'Send login link'}
            </button>
            {status === 'not_found' && (
              <p className="text-xs text-[#BA7517] text-center">Email not recognised.</p>
            )}
            {status === 'error' && (
              <p className="text-xs text-red-600 text-center">Something went wrong, try again.</p>
            )}
          </form>
        )}
      </div>
    </main>
  )
}
