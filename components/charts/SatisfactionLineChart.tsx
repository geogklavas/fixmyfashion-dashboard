'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function SatisfactionLineChart({
  data,
}: {
  data: { month: string; score: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="satFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#BA7517" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#BA7517" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <YAxis
          domain={[4, 5]}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v.toFixed(1)}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)' }}
          formatter={(v) => (typeof v === 'number' ? v.toFixed(2) : String(v))}
        />
        <Area type="monotone" dataKey="score" stroke="#BA7517" strokeWidth={2} fill="url(#satFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
