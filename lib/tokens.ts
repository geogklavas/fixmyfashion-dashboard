export const colors = {
  teal: '#0F6E56',
  tealLight: '#E1F5EE',
  tealMid: '#5DCAA5',
  amber: '#BA7517',
  blue: '#185FA5',
  purple: '#534AB7',
  textPrimary: '#1a1a1a',
  textSecondary: '#6b7280',
  border: 'rgba(0,0,0,0.1)',
  bgSecondary: '#f9fafb',
}

// 3 states only — aligned with the 3 real statuses in detectStatus().
export const statusChip: Record<string, { bg: string; fg: string }> = {
  'Quote sent': { bg: '#F1EFE8', fg: '#5F5E5A' },
  'In workshop': { bg: '#E6F1FB', fg: '#185FA5' },
  Dispatched: { bg: '#E1F5EE', fg: '#0F6E56' },
  Pending: { bg: '#f3f4f6', fg: '#6b7280' },
}

export const DASHBOARD_TABS = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'sustainability', label: 'Sustainability' },
  { slug: 'log', label: 'Repair Log' },
  { slug: 'analytics', label: 'Analytics' },
  { slug: 'reports', label: 'Reports' },
  { slug: 'settings', label: 'Settings' },
] as const

// detectGarmentType / detectRepairType removed in Sprint 6 — product-title
// keyword parsing was unreliable. Service classification now reads
// job-cat-* / job-type-* tags only.

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const day = 86_400_000
  if (diff < day) return 'today'
  const days = Math.floor(diff / day)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
