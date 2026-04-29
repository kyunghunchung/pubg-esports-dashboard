'use client'

import { useState, useMemo } from 'react'
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

// ── 월별 집계 데이터 ─────────────────────────────────────────────────────────

interface MonthData {
  month: string   // '01' ~ '12'
  label: string   // 'Jan' | '1월'
  content: number
  pccv: number | null
}

const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_NAMES_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

function aggregateByMonth(weeks: ContentCalendarWeek[], lang?: string): MonthData[] {
  const names = lang === 'ko' ? MONTH_NAMES_KO : MONTH_NAMES_EN
  const map = new Map<string, MonthData>()
  for (let m = 1; m <= 12; m++) {
    const key = String(m).padStart(2, '0')
    map.set(key, { month: key, label: names[m - 1], content: 0, pccv: null })
  }
  for (const w of weeks) {
    if (!w.weekStart) continue
    const mo = w.weekStart.slice(5, 7)
    const entry = map.get(mo)
    if (!entry) continue
    entry.content += w.content
    if (w.pccv != null) {
      entry.pccv = entry.pccv != null ? Math.max(entry.pccv, w.pccv) : w.pccv
    }
  }
  return Array.from(map.values())
}

// 이벤트 밴드의 startWk/endWk → 월 키 ('01'~'12')
function wkToMonth(wk: string, weeks: ContentCalendarWeek[]): string | null {
  return weeks.find(w => w.wk === wk)?.weekStart?.slice(5, 7) ?? null
}

// ── 커스텀 틱: 주차 아래 월 표기 ───────────────────────────────────────────

function WeekTick(props: {
  x?: number | string; y?: number | string
  payload?: { value: string; index: number }
  weeks: ContentCalendarWeek[]
  shownMonths: Set<string>
  [key: string]: unknown
}) {
  const { x = 0, y = 0, payload, weeks, shownMonths } = props
  const nx = typeof x === 'number' ? x : parseFloat(x as string) || 0
  const ny = typeof y === 'number' ? y : parseFloat(y as string) || 0
  if (!payload) return null
  const wk = payload.value
  const week = weeks.find(w => w.wk === wk)
  const monthStr = week?.weekStart?.slice(0, 7).replace('-', '/') ?? ''  // '2026/01'
  const showMonth = shownMonths.has(wk)

  return (
    <g transform={`translate(${nx},${ny})`}>
      <text x={0} y={4} textAnchor="middle" fill="#6B7280" fontSize={9}>{wk}</text>
      {showMonth && (
        <text x={0} y={17} textAnchor="middle" fill="#4B5563" fontSize={8}>{monthStr}</text>
      )}
    </g>
  )
}

// ── 툴팁 ───────────────────────────────────────────────────────────────────

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
        <p key={p.name} style={{ color: p.color }}>{p.name}: {formatNumber(p.value)}</p>
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
        <p key={p.name} style={{ color: p.color }}>{p.name}: {formatNumber(p.value)}</p>
      ) : null)}
    </div>
  )
}

function MonthTooltip({
  active, payload, label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs space-y-1 min-w-[140px]">
      <p className="text-gray-400 font-medium">{label}</p>
      {payload.map(p => p.value > 0 ? (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {formatNumber(p.value)}</p>
      ) : null)}
    </div>
  )
}

// ── 메인 컴포넌트 ───────────────────────────────────────────────────────────

type ViewMode = 'week' | 'month'

export function ContentCalendarChart({ data, year, lang }: Props) {
  const { weeks, events } = data
  const [hiddenBands, setHiddenBands] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('week')

  const hasContent = weeks.some(w => w.content > 0)
  const hasPccv    = weeks.some(w => w.pccv != null && w.pccv > 0)

  const xInterval = 3

  const visibleBands = events.filter(e => !hiddenBands.has(e.event_id))

  // 훅은 조기 return 이전에 모두 선언 (Rules of Hooks)
  const shownMonths = useMemo(() => {
    const set = new Set<string>()
    let lastMonth = ''
    weeks.forEach((w, i) => {
      if (i % (xInterval + 1) !== 0) return
      const mo = w.weekStart?.slice(5, 7) ?? ''
      if (mo !== lastMonth) {
        set.add(w.wk)
        lastMonth = mo
      }
    })
    return set
  }, [weeks])

  const monthData = useMemo(() => aggregateByMonth(weeks, lang), [weeks, lang])

  const monthBands = useMemo(() =>
    visibleBands.map(ev => ({
      ...ev,
      x1Month: wkToMonth(ev.startWk, weeks),
      x2Month: wkToMonth(ev.endWk, weeks),
    })).filter(ev => ev.x1Month && ev.x2Month),
    [visibleBands, weeks]
  )

  if (!hasContent && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-52 text-gray-500 text-sm">
        {lang === 'ko' ? `${year}년 콘텐츠 데이터 없음` : `No content data for ${year}`}
      </div>
    )
  }

  const minWidth = Math.max(900, weeks.length * 16)

  return (
    <div className="space-y-3">
      {/* 뷰 모드 토글 */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg overflow-hidden border border-brand-border text-xs">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 transition-colors ${viewMode === 'week' ? 'bg-brand-accent text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {lang === 'ko' ? '주' : 'Week'}
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 transition-colors ${viewMode === 'month' ? 'bg-brand-accent text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {lang === 'ko' ? '월' : 'Month'}
          </button>
        </div>
      </div>

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

      {/* ── 주 단위 뷰 ─────────────────────────────────────────────────────── */}
      {viewMode === 'week' && (
        <div className="overflow-x-auto">
          <div style={{ minWidth }}>
            {hasPccv && (
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={weeks} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  {visibleBands.map(ev => (
                    <ReferenceArea key={ev.event_id} x1={ev.startWk} x2={ev.endWk}
                      fill={ev.color} fillOpacity={0.08} stroke={ev.color} strokeOpacity={0.2} />
                  ))}
                  <XAxis dataKey="wk" tick={false} axisLine={{ stroke: '#374151' }} tickLine={false} height={4} />
                  <YAxis tick={{ fontSize: 10, fill: '#F59E0B' }} axisLine={false} tickLine={false} tickFormatter={fmt} width={40} />
                  <Tooltip content={<PccvTooltip weeks={weeks} events={events} />} cursor={{ stroke: '#ffffff20' }} />
                  <Line dataKey="pccv" name="PCCV" stroke="#F59E0B" strokeWidth={2}
                    dot={{ fill: '#F59E0B', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            )}

            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeks} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                {visibleBands.map(ev => (
                  <ReferenceArea key={ev.event_id} x1={ev.startWk} x2={ev.endWk}
                    fill={ev.color} fillOpacity={0.1} stroke={ev.color} strokeOpacity={0.25} />
                ))}
                <XAxis
                  dataKey="wk"
                  tick={(props) => <WeekTick {...props} weeks={weeks} shownMonths={shownMonths} />}
                  interval={xInterval}
                  axisLine={{ stroke: '#374151' }}
                  tickLine={false}
                  height={32}
                />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                  tickFormatter={fmt} width={40} allowDecimals={false} />
                <Tooltip content={<ContentTooltip weeks={weeks} events={events} />} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="content" name="Contents" fill="#3B82F6" fillOpacity={0.75}
                  radius={[2, 2, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── 월 단위 뷰 ─────────────────────────────────────────────────────── */}
      {viewMode === 'month' && (
        <div>
          {hasPccv && (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={monthData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                {monthBands.map(ev => (
                  <ReferenceArea key={ev.event_id} x1={ev.x1Month!} x2={ev.x2Month!}
                    fill={ev.color} fillOpacity={0.08} stroke={ev.color} strokeOpacity={0.2} />
                ))}
                <XAxis dataKey="month" tick={false} axisLine={{ stroke: '#374151' }} tickLine={false} height={4} />
                <YAxis tick={{ fontSize: 10, fill: '#F59E0B' }} axisLine={false} tickLine={false} tickFormatter={fmt} width={40} />
                <Tooltip content={<MonthTooltip />} cursor={{ stroke: '#ffffff20' }} />
                <Line dataKey="pccv" name="PCCV" stroke="#F59E0B" strokeWidth={2}
                  dot={{ fill: '#F59E0B', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          )}

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              {monthBands.map(ev => (
                <ReferenceArea key={ev.event_id} x1={ev.x1Month!} x2={ev.x2Month!}
                  fill={ev.color} fillOpacity={0.1} stroke={ev.color} strokeOpacity={0.25} />
              ))}
              <XAxis
                dataKey="month"
                tickFormatter={(mo) => {
                  const names = lang === 'ko' ? MONTH_NAMES_KO : MONTH_NAMES_EN
                  return names[parseInt(mo, 10) - 1] ?? mo
                }}
                tick={{ fontSize: 10, fill: '#6B7280' }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
                height={24}
              />
              <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                tickFormatter={fmt} width={40} allowDecimals={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || !label) return null
                  const names = lang === 'ko' ? MONTH_NAMES_KO : MONTH_NAMES_EN
                  const labelStr = String(label)
                  const monthLabel = names[parseInt(labelStr, 10) - 1] ?? labelStr
                  return (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs space-y-1 min-w-[140px]">
                      <p className="text-gray-400 font-medium">{year}/{labelStr} ({monthLabel})</p>
                      {payload.map(p => {
                        const val = typeof p.value === 'number' ? p.value : Number(p.value)
                        return val > 0 ? (
                          <p key={p.name} style={{ color: p.color }}>{p.name}: {formatNumber(val)}</p>
                        ) : null
                      })}
                    </div>
                  )
                }}
                cursor={{ fill: '#ffffff08' }}
              />
              <Bar dataKey="content" name="Contents" fill="#3B82F6" fillOpacity={0.75}
                radius={[3, 3, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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
