'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { REPAIR_TYPE_COLORS } from '@/lib/data'

export function RepairTypeDonut({ data }: { data: { type: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1
  return (
    <div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
        {data.map((d) => (
          <li key={d.type} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: REPAIR_TYPE_COLORS[d.type] ?? '#B8BAC0' }}
            />
            {d.type} <span className="text-gray-400">{Math.round((d.count / total) * 100)}%</span>
          </li>
        ))}
      </ul>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="type"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.type} fill={REPAIR_TYPE_COLORS[d.type] ?? '#B8BAC0'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)' }}
            formatter={(v, n) => [`${v} repairs`, n]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
