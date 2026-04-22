'use client'

import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
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

function ContentTooltip({
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
      {payload.map(p => p.value > 0 ? (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatNumber(p.value)}
        </p>
      ) : null)}
    </div>
  )
}

function PccvTooltip({
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
      {payload.map(p => p.value > 0 ? (
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
  const minWidth = Math.max(900, weeks.length * 16)
  const xInterval = 3

  return (
    <div className="space-y-3">
      {/* 이벤트 범례 */}
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
                borderColor:     hiddenBands.has(ev.event_id) ? '#374151' : ev.color,
                color:           hiddenBands.has(ev.event_id) ? '#6B7280' : ev.color,
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

      {/* 차트 — overflow-x-auto로 가로 스크롤 공유 */}
      <div className="overflow-x-auto">
        <div style={{ minWidth }}>

          {/* 상단 패널: PCCV 라인 차트 (데이터 있을 때만) */}
          {hasPccv && (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={weeks} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />

                {visibleBands.map(ev => (
                  <ReferenceArea
                    key={ev.event_id}
                    x1={ev.startWk}
                    x2={ev.endWk}
                    fill={ev.color}
                    fillOpacity={0.08}
                    stroke={ev.color}
                    strokeOpacity={0.2}
                  />
                ))}

                <XAxis
                  dataKey="wk"
                  tick={false}
                  axisLine={{ stroke: '#374151' }}
                  tickLine={false}
                  height={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#F59E0B' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmt}
                  width={40}
                />
                <Tooltip
                  content={<PccvTooltip weeks={weeks} events={events} />}
                  cursor={{ stroke: '#ffffff20' }}
                />
                <Line
                  dataKey="pccv"
                  name="PCCV"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ fill: '#F59E0B', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* 하단 패널: Content Count 바 차트 */}
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeks} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />

              {visibleBands.map(ev => (
                <ReferenceArea
                  key={ev.event_id}
                  x1={ev.startWk}
                  x2={ev.endWk}
                  fill={ev.color}
                  fillOpacity={0.1}
                  stroke={ev.color}
                  strokeOpacity={0.25}
                />
              ))}

              <XAxis
                dataKey="wk"
                tick={{ fontSize: 9, fill: '#6B7280' }}
                interval={xInterval}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmt}
                width={40}
                allowDecimals={false}
              />
              <Tooltip
                content={<ContentTooltip weeks={weeks} events={events} />}
                cursor={{ fill: '#ffffff08' }}
              />
              <Bar
                dataKey="content"
                name="Contents"
                fill="#3B82F6"
                fillOpacity={0.75}
                radius={[2, 2, 0, 0]}
                maxBarSize={14}
              />
            </BarChart>
          </ResponsiveContainer>

        </div>
      </div>

      {/* 범례 */}
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
