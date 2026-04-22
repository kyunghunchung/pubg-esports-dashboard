'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { formatNumber, cn } from '@/lib/utils'

type Metric = 'content_count' | 'impressions' | 'video_views' | 'engagements'

export interface BreakdownPoint {
  name: string
  content_count: number
  impressions:   number
  video_views:   number
  engagements:   number
}

interface Props {
  title: string
  data:  BreakdownPoint[]
  lang?: string
}

const METRIC_LABELS: Record<Metric, string> = {
  content_count: 'Contents',
  impressions:   'Impression',
  video_views:   'Views',
  engagements:   'Engagement',
}

const METRIC_COLORS: Record<Metric, string> = {
  content_count: '#3B82F6',
  impressions:   '#8B5CF6',
  video_views:   '#10B981',
  engagements:   '#F59E0B',
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export function BreakdownBarChart({ title, data, lang }: Props) {
  const [metric, setMetric] = useState<Metric>('content_count')

  const sorted = [...data]
    .filter(d => d.name)
    .sort((a, b) => b[metric] - a[metric])

  const chartHeight = Math.max(180, sorted.length * 34)

  if (sorted.length === 0) {
    return (
      <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">{title}</h2>
        <div className="flex items-center justify-center h-28 text-gray-500 text-sm">
          {lang === 'ko' ? '데이터 없음' : 'No data'}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-300">{title}</h2>
        <div className="flex rounded-lg border border-brand-border overflow-hidden">
          {(Object.keys(METRIC_LABELS) as Metric[]).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                metric === m ? 'bg-brand-accent text-white' : 'text-gray-400 hover:text-white',
              )}
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#6B7280' }}
            tickFormatter={fmt}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#D1D5DB' }}
            width={90}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => [formatNumber(Number(v)), METRIC_LABELS[metric]]}
            contentStyle={{
              backgroundColor: '#111827',
              border: '1px solid #374151',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: '#9CA3AF' }}
          />
          <Bar dataKey={metric} radius={[0, 3, 3, 0]} maxBarSize={22}>
            {sorted.map((_, i) => (
              <Cell
                key={i}
                fill={METRIC_COLORS[metric]}
                fillOpacity={Math.max(0.35, 1 - i * 0.07)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
