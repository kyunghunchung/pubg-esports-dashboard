'use client'

import { useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { cn, formatNumber } from '@/lib/utils'
import type { HistoricalEntry, TournamentType } from '@/lib/import/parse-historical'

const TYPE_COLORS: Record<TournamentType, string> = {
  PGC:   '#EF4444',
  PNC:   '#3B82F6',
  PGS:   '#10B981',
  PCS:   '#8B5CF6',
  PGI:   '#F59E0B',
  EWC:   '#F97316',
  Other: '#6B7280',
}

const FILTER_TABS: { label: string; value: TournamentType | 'ALL' }[] = [
  { label: '전체', value: 'ALL' },
  { label: 'PGC', value: 'PGC' },
  { label: 'PNC', value: 'PNC' },
  { label: 'PGS', value: 'PGS' },
  { label: 'PCS', value: 'PCS' },
  { label: 'PGI', value: 'PGI' },
  { label: 'EWC', value: 'EWC' },
]

interface Props {
  data: HistoricalEntry[]
}

function yFormatter(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(v)
}

interface TooltipPayload {
  value: number
  name: string
  color: string
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-3 text-xs space-y-1 min-w-[160px]">
      <p className="text-white font-semibold mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-gray-300 tabular-nums">{formatNumber(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function HistoricalViewershipChart({ data }: Props) {
  const [activeFilter, setActiveFilter] = useState<TournamentType | 'ALL'>('ALL')

  const filtered = activeFilter === 'ALL' ? data : data.filter((d) => d.type === activeFilter)

  // 전체 뷰일 때 스크롤 가능하도록 최소 폭 계산
  const BAR_SLOT = 32
  const minWidth = Math.max(600, filtered.length * BAR_SLOT)

  const counts: Partial<Record<TournamentType | 'ALL', number>> = { ALL: data.length }
  data.forEach((d) => { counts[d.type] = (counts[d.type] ?? 0) + 1 })

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        데이터 없음
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 필터 탭 */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map(({ label, value }) => {
          const count = counts[value] ?? 0
          if (value !== 'ALL' && count === 0) return null
          return (
            <button
              key={value}
              onClick={() => setActiveFilter(value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeFilter === value
                  ? 'bg-brand-accent text-white'
                  : 'bg-brand-bg border border-brand-border text-gray-400 hover:text-white hover:border-gray-500'
              )}
            >
              {value !== 'ALL' && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: TYPE_COLORS[value as TournamentType] }}
                />
              )}
              {label}
              <span className={cn(
                'text-[10px]',
                activeFilter === value ? 'text-white/70' : 'text-gray-500'
              )}>
                ({count})
              </span>
            </button>
          )
        })}
      </div>

      {/* 범례 (전체 탭일 때만) */}
      {activeFilter === 'ALL' && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {(Object.entries(TYPE_COLORS) as [TournamentType, string][]).map(([type, color]) => (
            (counts[type] ?? 0) > 0 && (
              <div key={type} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {type}
              </div>
            )
          ))}
        </div>
      )}

      {/* 차트 */}
      <div className="overflow-x-auto">
        <div style={{ minWidth }}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={filtered} margin={{ top: 4, right: 16, left: 0, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis
                dataKey="shortName"
                tick={{ fill: '#9CA3AF', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                angle={-40}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tickFormatter={yFormatter}
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="peak_ccv" name="Peak CCV" radius={[3, 3, 0, 0]} maxBarSize={28}>
                {filtered.map((entry, i) => (
                  <Cell key={i} fill={TYPE_COLORS[entry.type]} fillOpacity={0.85} />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="accv"
                name="ACCV"
                stroke="#9CA3AF"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-xs text-gray-500">출처: Escharts 기준 · UV는 Official+Unofficial 합산</p>
    </div>
  )
}
