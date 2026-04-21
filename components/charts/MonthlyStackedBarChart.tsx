'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { JOB_CATEGORIES, JOB_CATEGORY_COLORS } from '@/lib/data'

const CATEGORY_LABELS: Record<string, string> = {
  repair: 'Repair',
  alteration: 'Alteration',
  cleaning: 'Cleaning',
  colour: 'Colour',
}

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
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" formatter={(v) => CATEGORY_LABELS[v] ?? v} />
        {JOB_CATEGORIES.map((cat, i) => (
          <Bar
            key={cat}
            dataKey={cat}
            stackId="a"
            fill={JOB_CATEGORY_COLORS[cat]}
            radius={i === JOB_CATEGORIES.length - 1 ? [4, 4, 0, 0] : 0}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
