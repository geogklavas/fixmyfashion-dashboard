'use client'

import { useMemo, useState } from 'react'
import { StatusChip } from './StatusChip'
import { formatFullDate, formatRelative } from '@/lib/tokens'

export type LogRow = {
  id: string
  orderName: string
  createdAt: string
  status: string
  productTitle: string
  price: string
  fulfilledAt: string | null
}

const STATUSES = ['All', 'Quote sent', 'In workshop', 'Dispatched']
const PAGE_SIZE = 20

function daysInWorkshop(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
}

export function RepairLogTable({ rows }: { rows: LogRow[] }) {
  const [status, setStatus] = useState('All')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const fromMs = from ? new Date(from).getTime() : null
    const toMs = to ? new Date(to).getTime() + 86_400_000 - 1 : null // inclusive end of day
    return rows.filter((r) => {
      if (status !== 'All' && r.status !== status) return false
      if (fromMs != null || toMs != null) {
        const t = new Date(r.createdAt).getTime()
        if (fromMs != null && t < fromMs) return false
        if (toMs != null && t > toMs) return false
      }
      if (q) {
        const lastFour = r.orderName.replace('#', '').slice(-4).toLowerCase()
        const fmf = `fmf-${lastFour}`
        if (!r.orderName.toLowerCase().includes(q) && !fmf.includes(q)) return false
      }
      return true
    })
  }, [rows, status, from, to, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const slice = filtered.slice(start, start + PAGE_SIZE)

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          <span>Search</span>
          <input
            type="search"
            placeholder="#FMF-1234 or 1234"
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
            className="border border-black/10 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20 min-w-[200px]"
          />
        </label>
        <Select label="Status" value={status} options={STATUSES} onChange={resetPage(setStatus)} />
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          <span>From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => resetPage(setFrom)(e.target.value)}
            className="border border-black/10 rounded-lg px-2.5 py-1.5 text-sm bg-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          <span>To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => resetPage(setTo)(e.target.value)}
            className="border border-black/10 rounded-lg px-2.5 py-1.5 text-sm bg-white"
          />
        </label>
      </div>

      <div className="bg-white border border-black/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <Th>Order ID</Th>
                <Th>Date</Th>
                <Th>Repair</Th>
                <Th>Status</Th>
                <Th className="text-right">Customer paid</Th>
                <Th className="text-right">Days in workshop</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {slice.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                    No repairs match the current filters.
                  </td>
                </tr>
              )}
              {slice.map((r) => {
                const lastFour = r.orderName.replace('#', '').slice(-4)
                const full = r.productTitle.length > 40 ? r.productTitle.slice(0, 40) + '…' : r.productTitle
                const days = r.status === 'In workshop' ? daysInWorkshop(r.createdAt) : null
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <Td className="font-mono text-xs text-gray-700">#FMF-{lastFour}</Td>
                    <Td>
                      <span title={formatFullDate(r.createdAt)}>{formatRelative(r.createdAt)}</span>
                    </Td>
                    <Td>
                      <span className="text-gray-700" title={r.productTitle}>
                        {full}
                      </span>
                    </Td>
                    <Td>
                      <StatusChip status={r.status} />
                    </Td>
                    <Td className="text-right tabular-nums">€{parseFloat(r.price).toFixed(0)}</Td>
                    <Td className="text-right tabular-nums">
                      {days == null ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span className={days > 10 ? 'text-[#BA7517] font-medium' : 'text-gray-700'}>{days}d</span>
                      )}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div>
          Showing {filtered.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of{' '}
          {filtered.length} repairs · Customer IDs anonymised per GDPR
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded border border-black/10 disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 rounded border border-black/10 disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left px-4 py-2.5 font-medium ${className}`}>{children}</th>
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-500">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-black/10 rounded-lg px-2.5 py-1.5 text-sm bg-white hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  )
}
