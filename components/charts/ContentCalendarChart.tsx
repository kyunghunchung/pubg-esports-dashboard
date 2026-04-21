'use client'

import { useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceArea,
} from 'recharts'
import { formatNumber } from '@/lib/utils'
import type { ContentCalendarData, ContentCalendarWeek, ContentCalendarBand } from '@/lib/store'

interface Props {
  data: ContentCalendarData
  year: number
  lang?: string
}

function fmt(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000)    return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

function CustomTooltip({
  active, payload, label, weeks, events,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
  weeks: ContentCalendarWeek[]
  events: ContentCalendarBand[]
}) {
  if (!active || !payload?.length || !label) return null
  const week = weeks.find(w => w.wk === label)
  const band = events.find(e => e.startWk <= label && label <= e.endWk)
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs space-y-1 min-w-[160px]">
      <p className="text-gray-400 font-medium">{label}  {week?.weekStart?.slice(5).replace('-', '/')} ~ {week?.weekEnd?.slice(5).replace('-', '/')}</p>
      {band && <p style={{ color: band.color }} className="font-semibold">{band.display_name}</p>}
      {payload.map(p => p.value > 0 || p.name === 'PCCV' ? (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatNumber(p.value)}
        </p>
      ) : null)}
    </div>
  )
}

export function ContentCalendarChart({ data, year, lang }: Props) {
  const { weeks, events } = data
  const [hiddenBands, setHiddenBands] = useState<Set<string>>(new Set())

  const hasContent = weeks.some(w => w.content > 0)
  const hasPccv    = weeks.some(w => w.pccv != null && w.pccv > 0)

  if (!hasContent && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-52 text-gray-500 text-sm">
        {lang === 'ko' ? `${year}년 콘텐츠 데이터 없음` : `No content data for ${year}`}
      </div>
    )
  }

  const visibleBands = events.filter(e => !hiddenBands.has(e.event_id))

  return (
    <div className="space-y-3">
      {/* 이벤트 범례 (클릭으로 밴드 토글) */}
      {events.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {events.map(ev => (
            <button
              key={ev.event_id}
              onClick={() => setHiddenBands(prev => {
                const next = new Set(prev)
                next.has(ev.event_id) ? next.delete(ev.event_id) : next.add(ev.event_id)
                return next
              })}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs transition-all"
              style={{
                borderColor: hiddenBands.has(ev.event_id) ? '#374151' : ev.color,
                color:       hiddenBands.has(ev.event_id) ? '#6B7280' : ev.color,
                backgroundColor: hiddenBands.has(ev.event_id) ? 'transparent' : `${ev.color}15`,
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hiddenBands.has(ev.event_id) ? '#374151' : ev.color }} />
              {ev.display_name}
              {ev.pccv ? <span className="text-gray-500 ml-0.5">{fmt(ev.pccv)}</span> : null}
            </button>
          ))}
        </div>
      )}

      {/* 차트 */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: Math.max(900, weeks.length * 16) }}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={weeks} margin={{ top: 24, right: hasPccv ? 56 : 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />

              {/* 이벤트 밴드 */}
              {visibleBands.map(ev => (
                <ReferenceArea
                  key={ev.event_id}
                  x1={ev.startWk}
                  x2={ev.endWk}
                  fill={ev.color}
                  fillOpacity={0.1}
                  stroke={ev.color}
                  strokeOpacity={0.25}
                  label={{ value: ev.display_name, position: 'insideTopLeft', fontSize: 9, fill: ev.color, dy: -14 }}
                />
              ))}

              <XAxis
                dataKey="wk"
                tick={{ fontSize: 9, fill: '#6B7280' }}
                interval={3}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="content"
                orientation="left"
                tick={{ fontSize: 10, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmt}
                width={40}
                allowDecimals={false}
              />
              {hasPccv && (
                <YAxis
                  yAxisId="pccv"
                  orientation="right"
                  tick={{ fontSize: 10, fill: '#F59E0B' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmt}
                  width={52}
                />
              )}

              <Tooltip
                content={
                  <CustomTooltip weeks={weeks} events={events} />
                }
                cursor={{ fill: '#ffffff08' }}
              />

              <Bar
                yAxisId="content"
                dataKey="content"
                name="Contents"
                fill="#3B82F6"
                fillOpacity={0.75}
                radius={[2, 2, 0, 0]}
                maxBarSize={14}
              />

              {hasPccv && (
                <Line
                  yAxisId="pccv"
                  dataKey="pccv"
                  name="PCCV"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ fill: '#F59E0B', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 하단 설명 */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500 opacity-75" />
          {lang === 'ko' ? '콘텐츠 발행 수' : 'Content Count'}
        </span>
        {hasPccv && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-yellow-400" />
            PCCV
          </span>
        )}
        {events.length > 0 && (
          <span className="text-gray-600">
            {lang === 'ko' ? '이벤트 클릭 시 밴드 숨김/표시' : 'Click event to toggle band'}
          </span>
        )}
      </div>
    </div>
  )
}
