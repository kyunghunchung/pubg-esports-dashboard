'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { formatNumber } from '@/lib/utils'
import type { SocialTrendPoint } from '@/lib/store'

interface Props {
  data:    SocialTrendPoint[]
  metric:  'impressions' | 'content_count' | 'engagements' | 'video_views'
  period:  'monthly' | 'weekly'
}

const METRIC_LABEL: Record<Props['metric'], string> = {
  impressions:   '노출',
  content_count: '콘텐츠 수',
  engagements:   'Engagement',
  video_views:   '조회 수',
}

const METRIC_COLOR: Record<Props['metric'], string> = {
  impressions:   '#3B82F6',
  content_count: '#10B981',
  engagements:   '#F59E0B',
  video_views:   '#8B5CF6',
}

export function ContentsTrendChart({ data, metric, period }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        데이터가 없습니다
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
        <XAxis
          dataKey="period"
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => formatNumber(v)}
          width={60}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: 8 }}
          labelStyle={{ color: '#E5E7EB', fontSize: 12, marginBottom: 4 }}
          formatter={(value) => [formatNumber(Number(value ?? 0)), METRIC_LABEL[metric]]}
        />
        <Bar
          dataKey={metric}
          name={METRIC_LABEL[metric]}
          fill={METRIC_COLOR[metric]}
          radius={[3, 3, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
