'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DASHBOARD_TABS } from '@/lib/tokens'

export function TabNav({ primaryColor }: { primaryColor: string }) {
  const pathname = usePathname()
  return (
    <nav className="border-b border-black/10 overflow-x-auto">
      <ul className="flex gap-1 px-6 min-w-max">
        {DASHBOARD_TABS.map((tab) => {
          const href = `/dashboard/${tab.slug}`
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={tab.slug}>
              <Link
                href={href}
                className="inline-block px-4 py-3 text-sm font-medium border-b-2 transition -mb-px"
                style={{
                  color: active ? primaryColor : '#6b7280',
                  borderColor: active ? primaryColor : 'transparent',
                }}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
