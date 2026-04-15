'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { formatNumber } from '@/lib/utils'

interface DataPoint {
  date: string
  twitch?: number
  youtube?: number
  afreeca?: number
  total?: number
}

interface Props {
  data: DataPoint[]
  showPlatforms?: boolean
}

const COLORS = {
  total:   '#3B82F6',
  twitch:  '#9146FF',
  youtube: '#FF0000',
  afreeca: '#00B4D8',
}

export function CcvLineChart({ data, showPlatforms = false }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!data.length) return <div className="flex items-center justify-center h-48 text-gray-500 text-sm">데이터 없음</div>
  if (!mounted) return <div className="h-[240px]" />

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
        <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} />
        <YAxis
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: 8 }}
          labelStyle={{ color: '#E5E7EB', fontSize: 12 }}
          formatter={(value) => [formatNumber(Number(value)), '']}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }}
        />
        {showPlatforms ? (
          <>
            <Line type="monotone" dataKey="twitch"  stroke={COLORS.twitch}  dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="youtube" stroke={COLORS.youtube} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="afreeca" stroke={COLORS.afreeca} dot={false} strokeWidth={2} />
          </>
        ) : (
          <Line type="monotone" dataKey="total" stroke={COLORS.total} dot={false} strokeWidth={2.5} name="총 CCV" />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
