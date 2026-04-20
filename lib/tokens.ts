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

export const statusChip: Record<string, { bg: string; fg: string }> = {
  'Quote sent': { bg: '#FAEEDA', fg: '#BA7517' },
  Confirmed: { bg: '#FAEEDA', fg: '#BA7517' },
  Received: { bg: '#FAEEDA', fg: '#BA7517' },
  'In progress': { bg: '#E6F1FB', fg: '#185FA5' },
  'QA complete': { bg: '#E1F5EE', fg: '#0F6E56' },
  Dispatched: { bg: '#EEEDFE', fg: '#534AB7' },
  Delivered: { bg: '#E1F5EE', fg: '#0F6E56' },
  Pending: { bg: '#f3f4f6', fg: '#6b7280' },
}

export const DASHBOARD_TABS = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'sustainability', label: 'Sustainability' },
  { slug: 'log', label: 'Repair Log' },
  { slug: 'analytics', label: 'Analytics' },
  { slug: 'map', label: 'Map' },
  { slug: 'reports', label: 'Reports' },
  { slug: 'settings', label: 'Settings' },
] as const

export function detectGarmentType(productTitle: string): string {
  const t = productTitle.toLowerCase()
  if (t.includes('jean') || t.includes('denim')) return 'JN'
  if (t.includes('jacket') || t.includes('coat')) return 'JK'
  if (t.includes('trouser') || t.includes('pant')) return 'TR'
  if (t.includes('shirt') || t.includes('blouse') || t.includes('top')) return 'SH'
  if (t.includes('knit') || t.includes('wool') || t.includes('sweater')) return 'KW'
  if (t.includes('dress') || t.includes('skirt')) return 'DR'
  return '—'
}

export function detectRepairType(productTitle: string): string {
  const t = productTitle.toLowerCase()
  if (t.includes('zip')) return 'Zip'
  if (t.includes('hem')) return 'Hem'
  if (t.includes('seam')) return 'Seam'
  if (t.includes('button')) return 'Button'
  if (t.includes('knit') || t.includes('darn')) return 'Knitwear'
  if (t.includes('waist') || t.includes('alter')) return 'Alteration'
  return 'Other'
}

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
