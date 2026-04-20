'use client'

import { useMemo, useState } from 'react'
import { StatusChip } from './StatusChip'
import { detectGarmentType, detectRepairType, formatFullDate, formatRelative } from '@/lib/tokens'

export type LogRow = {
  id: string
  orderName: string
  createdAt: string
  status: string
  productTitle: string
  price: string
}

const STATUSES = ['All', 'Quote sent', 'Confirmed', 'Received', 'In progress', 'QA complete', 'Dispatched', 'Delivered']
const REPAIR_TYPES = ['All', 'Zip', 'Hem', 'Seam', 'Button', 'Knitwear', 'Alteration', 'Other']
const PAGE_SIZE = 20

export function RepairLogTable({ rows }: { rows: LogRow[] }) {
  const [status, setStatus] = useState('All')
  const [repairType, setRepairType] = useState('All')
  const [month, setMonth] = useState('All')
  const [page, setPage] = useState(1)

  const months = useMemo(() => {
    const now = new Date()
    const arr: { key: string; label: string }[] = [{ key: 'All', label: 'All months' }]
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      arr.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      })
    }
    return arr
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status !== 'All' && r.status !== status) return false
      if (repairType !== 'All' && detectRepairType(r.productTitle) !== repairType) return false
      if (month !== 'All') {
        const d = new Date(r.createdAt)
        if (`${d.getFullYear()}-${d.getMonth()}` !== month) return false
      }
      return true
    })
  }, [rows, status, repairType, month])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const slice = filtered.slice(start, start + PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select label="Status" value={status} options={STATUSES} onChange={(v) => { setStatus(v); setPage(1) }} />
        <Select
          label="Repair type"
          value={repairType}
          options={REPAIR_TYPES}
          onChange={(v) => { setRepairType(v); setPage(1) }}
        />
        <Select
          label="Month"
          value={month}
          options={months.map((m) => m.key)}
          labels={months.map((m) => m.label)}
          onChange={(v) => { setMonth(v); setPage(1) }}
        />
      </div>

      <div className="bg-white border border-black/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <Th>Order ID</Th>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th>Repair</Th>
                <Th>Status</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">Score</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {slice.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                    No repairs match the current filters.
                  </td>
                </tr>
              )}
              {slice.map((r) => {
                const lastFour = r.orderName.replace('#', '').slice(-4)
                const garment = detectGarmentType(r.productTitle)
                const title = r.productTitle.length > 24 ? r.productTitle.slice(0, 24) + '…' : r.productTitle
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <Td className="font-mono text-xs text-gray-700">#FMF-{lastFour}</Td>
                    <Td>
                      <span title={formatFullDate(r.createdAt)}>{formatRelative(r.createdAt)}</span>
                    </Td>
                    <Td>
                      <span className="inline-block w-8 text-center text-[10px] font-bold text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">
                        {garment}
                      </span>
                    </Td>
                    <Td className="text-gray-700">{title}</Td>
                    <Td>
                      <StatusChip status={r.status} />
                    </Td>
                    <Td className="text-right tabular-nums">€{parseFloat(r.price).toFixed(0)}</Td>
                    <Td className="text-right text-gray-400">—</Td>
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
  labels,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  labels?: string[]
  onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-black/10 rounded-lg px-2.5 py-1.5 text-sm bg-white hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
      >
        {options.map((opt, i) => (
          <option key={opt} value={opt}>
            {labels?.[i] ?? opt}
          </option>
        ))}
      </select>
    </label>
  )
}
