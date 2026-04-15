'use client'

import { useEffect, useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatNumber } from '@/lib/utils'
import type { SocialByLanguageRow } from '@/lib/mock-data'

interface Props {
  data: SocialByLanguageRow[]
}

export function SocialByLanguageChart({ data }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!data.length) return (
    <div className="flex items-center justify-center h-48 text-gray-500 text-sm">데이터 없음</div>
  )
  if (!mounted) return <div className="h-[260px]" />

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 4, right: 48, left: 0, bottom: 0 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
        <XAxis
          dataKey="language"
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="left"
          tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(v) => `${v}건`}
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: 8 }}
          formatter={(value, name) => [
            name === '콘텐츠 수' ? `${value}건` : formatNumber(Number(value)),
            name,
          ]}
          cursor={{ fill: '#ffffff08' }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
        <Bar yAxisId="left" dataKey="impressions" name="노출"     fill="#3B82F6" radius={[3, 3, 0, 0]} />
        <Bar yAxisId="left" dataKey="engagements" name="반응"     fill="#10B981" radius={[3, 3, 0, 0]} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="content_count"
          name="콘텐츠 수"
          stroke="#F59E0B"
          strokeWidth={2}
          dot={{ fill: '#F59E0B', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
