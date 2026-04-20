import { statusChip } from '@/lib/tokens'

export function StatusChip({ status }: { status: string }) {
  const { bg, fg } = statusChip[status] ?? statusChip.Pending
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium"
      style={{ background: bg, color: fg }}
    >
      {status}
    </span>
  )
}
