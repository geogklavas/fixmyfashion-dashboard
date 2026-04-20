'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { REPAIR_TYPES, REPAIR_TYPE_COLORS } from '@/lib/data'

export function MonthlyStackedBarChart({
  data,
}: {
  data: { month: string; [k: string]: string | number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)' }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" />
        {REPAIR_TYPES.map((type, i) => (
          <Bar
            key={type}
            dataKey={type}
            stackId="a"
            fill={REPAIR_TYPE_COLORS[type]}
            radius={i === REPAIR_TYPES.length - 1 ? [4, 4, 0, 0] : 0}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
