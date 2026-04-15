'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatNumber } from '@/lib/utils'

interface DataPoint {
  date: string
  attendance: number
}

interface Props {
  data: DataPoint[]
}

export function AttendanceBarChart({ data }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!data.length) return <div className="flex items-center justify-center h-48 text-gray-500 text-sm">데이터 없음</div>
  if (!mounted) return <div className="h-[220px]" />

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barSize={24}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(1)}K`} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: 8 }}
          formatter={(value) => [formatNumber(Number(value)), '관객']}
        />
        <Bar dataKey="attendance" fill="#3B82F6" radius={[4, 4, 0, 0]} name="관객" />
      </BarChart>
    </ResponsiveContainer>
  )
}
