'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatNumber } from '@/lib/utils'

interface DataPoint {
  name: string
  value: number
}

interface Props {
  data: DataPoint[]
  label?: string
}

const COLORS = ['#9146FF', '#FF0000', '#00B4D8', '#3B82F6']

export function PlatformDonut({ data, label }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!data.length) return <div className="flex items-center justify-center h-40 text-gray-500 text-sm">데이터 없음</div>
  if (!mounted) return <div className="h-[200px]" />

  return (
    <div>
      {label && <p className="text-sm text-gray-400 mb-2">{label}</p>}
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: 8 }}
            formatter={(value) => formatNumber(Number(value))}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
