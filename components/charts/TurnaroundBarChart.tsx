'use client'

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function TurnaroundBarChart({ data }: { data: { bucket: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
        <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)' }}
          formatter={(v) => [`${v} repairs`, 'Count']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((d) => {
            const over = d.bucket === '10d+'
            return <Cell key={d.bucket} fill={over ? '#BA7517' : '#185FA5'} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
