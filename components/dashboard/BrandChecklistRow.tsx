'use client'

import { useState, useTransition } from 'react'

type Initial = {
  brandHandle: string
  footerDone: boolean
  emailDone: boolean
  packagingDone: boolean
  nextReviewDate: string | null
}

export function BrandChecklistRow({ initial }: { initial: Initial }) {
  const [footer, setFooter] = useState(initial.footerDone)
  const [email, setEmail] = useState(initial.emailDone)
  const [packaging, setPackaging] = useState(initial.packagingDone)
  const [date, setDate] = useState(initial.nextReviewDate ?? '')
  const [pending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dirty =
    footer !== initial.footerDone ||
    email !== initial.emailDone ||
    packaging !== initial.packagingDone ||
    date !== (initial.nextReviewDate ?? '')

  function save() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/brand-checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandHandle: initial.brandHandle,
            footerDone: footer,
            emailDone: email,
            packagingDone: packaging,
            nextReviewDate: date || null,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body.error ?? `HTTP ${res.status}`)
          return
        }
        setSavedAt(Date.now())
        // Mutate initial so dirty=false until next change
        Object.assign(initial, {
          footerDone: footer,
          emailDone: email,
          packagingDone: packaging,
          nextReviewDate: date || null,
        })
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
      <Toggle label="Footer" value={footer} onChange={setFooter} />
      <Toggle label="Email" value={email} onChange={setEmail} />
      <Toggle label="Packaging" value={packaging} onChange={setPackaging} />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border border-black/10 rounded-md px-2 py-1 text-xs bg-white"
      />
      <button
        onClick={save}
        disabled={!dirty || pending}
        className="px-2.5 py-1 rounded-md bg-[#0F6E56] text-white text-xs font-medium hover:bg-[#0c5c48] disabled:opacity-40"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
      {savedAt && !dirty && <span className="text-[#0F6E56]">Saved.</span>}
      {error && <span className="text-red-600">Error: {error}</span>}
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] ${
        value ? 'bg-[#E1F5EE] border-[#5DCAA5] text-[#0F6E56]' : 'bg-white border-black/10 text-gray-500'
      }`}
    >
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold bg-white/60">
        {value ? '✓' : '·'}
      </span>
      {label}
    </button>
  )
}
