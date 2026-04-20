'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function PickupMethodChart({
  data,
}: {
  data: { month: string; ELTA: number; BoxNow: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" />
        <Bar dataKey="ELTA" stackId="a" fill="#0F6E56" />
        <Bar dataKey="BoxNow" stackId="a" fill="#5DCAA5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
