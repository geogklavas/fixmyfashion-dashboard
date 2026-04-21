'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { JOB_CATEGORY_COLORS } from '@/lib/data'

type CategoryRow = { category: string; count: number }
type TypeRow = { type: string; label: string; count: number; category: string }

const CATEGORY_LABELS: Record<string, string> = {
  repair: 'Repair',
  alteration: 'Alteration',
  cleaning: 'Cleaning',
  colour: 'Colour',
}

export function ServiceBreakdownDonut({
  categories,
  types,
}: {
  categories: CategoryRow[]
  types: TypeRow[]
}) {
  const total = categories.reduce((s, d) => s + d.count, 0) || 1

  return (
    <div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
        {categories.map((d) => (
          <li key={d.category} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: JOB_CATEGORY_COLORS[d.category] ?? '#B8BAC0' }}
            />
            {CATEGORY_LABELS[d.category] ?? d.category}{' '}
            <span className="text-gray-400">{Math.round((d.count / total) * 100)}%</span>
          </li>
        ))}
      </ul>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          {/* Outer ring — categories */}
          <Pie
            data={categories}
            dataKey="count"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            stroke="none"
          >
            {categories.map((d) => (
              <Cell key={d.category} fill={JOB_CATEGORY_COLORS[d.category] ?? '#B8BAC0'} />
            ))}
          </Pie>
          {/* Inner ring — job types (repair + alteration only) */}
          {types.length > 0 && (
            <Pie
              data={types}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={1}
              stroke="none"
            >
              {types.map((d) => (
                <Cell
                  key={d.type}
                  fill={JOB_CATEGORY_COLORS[d.category] ?? '#B8BAC0'}
                  fillOpacity={0.6}
                />
              ))}
            </Pie>
          )}
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)' }}
            formatter={(v, n) => [`${v} orders`, n]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
