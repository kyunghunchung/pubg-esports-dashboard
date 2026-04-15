'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DataPoint {
  date: string
  [platform: string]: string | number
}

interface Props {
  data: DataPoint[]
}

const COLORS: Record<string, string> = {
  x: '#1DA1F2', instagram: '#E1306C', facebook: '#1877F2', tiktok: '#69C9D0', youtube: '#FF0000',
}

export function ErLineChart({ data }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!data.length) return <div className="flex items-center justify-center h-48 text-gray-500 text-sm">데이터 없음</div>
  if (!mounted) return <div className="h-[220px]" />

  const platforms = Object.keys(data[0]).filter((k) => k !== 'date')
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
        <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} />
        <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: 8 }}
          formatter={(value) => [`${Number(value).toFixed(2)}%`, '']}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
        {platforms.map((p) => (
          <Line key={p} type="monotone" dataKey={p} stroke={COLORS[p] ?? '#6B7280'} dot={false} strokeWidth={2} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
