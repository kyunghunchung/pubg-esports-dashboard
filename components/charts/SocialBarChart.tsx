'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { formatNumber } from '@/lib/utils'

interface DataPoint {
  platform: string
  impressions: number
  engagements: number
  video_views: number
}

interface Props {
  data: DataPoint[]
}

export function SocialBarChart({ data }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!data.length) return <div className="flex items-center justify-center h-48 text-gray-500 text-sm">데이터 없음</div>
  if (!mounted) return <div className="h-[220px]" />

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barSize={16}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
        <XAxis dataKey="platform" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: 8 }}
          formatter={(value, name) => [formatNumber(Number(value)), name]}
        />
        <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
        <Bar dataKey="impressions"  name="노출"   fill="#3B82F6" radius={[3,3,0,0]} />
        <Bar dataKey="video_views"  name="영상 뷰" fill="#8B5CF6" radius={[3,3,0,0]} />
        <Bar dataKey="engagements"  name="반응"   fill="#10B981" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
