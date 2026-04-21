'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatNumber } from '@/lib/utils'

interface DataPoint {
  name: string
  value: number
}

interface Props {
  data: DataPoint[]
  emptyText?: string
}

const PALETTE = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#A855F7',
]

export function RatioDonutChart({ data, emptyText = 'No data' }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-[220px]" />

  const total = data.reduce((s, d) => s + d.value, 0)

  if (!data.length || total === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-gray-500 text-sm">
        {emptyText}
      </div>
    )
  }

  const enriched = data.map(d => ({
    ...d,
    pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0',
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={enriched}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
        >
          {enriched.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: 8 }}
          formatter={(value, name) => [
            `${formatNumber(Number(value))} (${enriched.find(d => d.name === name)?.pct ?? 0}%)`,
            name,
          ]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }}
          formatter={(value) => {
            const item = enriched.find(d => d.name === value)
            return `${value} ${item?.pct ?? 0}%`
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
