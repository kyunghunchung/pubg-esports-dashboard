'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatNumber } from '@/lib/utils'

interface DataPoint {
  platform: string
  peak_ccv: number
}

interface Props {
  data: DataPoint[]
}

const COLORS: Record<string, string> = {
  twitch:  '#9146FF',
  youtube: '#FF0000',
  afreeca: '#00B4D8',
  total:   '#3B82F6',
}

export function PlatformCcvChart({ data }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-[240px]" />
  if (!data.length) return <div className="flex items-center justify-center h-48 text-gray-500 text-sm">데이터 없음</div>

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barSize={40}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
        <XAxis dataKey="platform" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={v => `${(v / 1000).toFixed(0)}K`}
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          axisLine={false} tickLine={false} width={40}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: 8 }}
          formatter={(value) => [formatNumber(Number(value)), 'Peak CCV']}
          cursor={{ fill: '#ffffff08' }}
        />
        <Bar dataKey="peak_ccv" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={COLORS[entry.platform] ?? '#6B7280'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
