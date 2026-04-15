'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatNumber } from '@/lib/utils'
import type { CcvByLanguageRow } from '@/lib/mock-data'

interface Props {
  data: CcvByLanguageRow[]
}

const PLATFORM_COLORS = {
  twitch:  '#9146FF',
  youtube: '#FF0000',
  afreeca: '#00B4D8',
}

export function CcvByLanguageChart({ data }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!data.length) return (
    <div className="flex items-center justify-center h-48 text-gray-500 text-sm">데이터 없음</div>
  )
  if (!mounted) return <div className="h-[260px]" />

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
        <XAxis
          dataKey="language"
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: 8 }}
          formatter={(value, name) => [formatNumber(Number(value)), name]}
          cursor={{ fill: '#ffffff08' }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
        <Bar dataKey="twitch"  name="Twitch"  stackId="a" fill={PLATFORM_COLORS.twitch}  />
        <Bar dataKey="youtube" name="YouTube" stackId="a" fill={PLATFORM_COLORS.youtube} />
        <Bar dataKey="afreeca" name="Afreeca" stackId="a" fill={PLATFORM_COLORS.afreeca} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
