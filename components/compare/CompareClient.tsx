'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { cn, formatNumber, formatPercent } from '@/lib/utils'
import { calcAchievement } from '@/lib/kpi/achievement'
import type { Event, ViewershipKpi, SocialKpi, KpiTarget } from '@/types'

interface EventData {
  event: Event
  viewership: ViewershipKpi[]
  social: SocialKpi[]
  targets: KpiTarget[]
}

interface Props {
  events: Event[]
  allData: Record<string, EventData>
}

const EVENT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']

const METRICS = [
  { key: 'peak_ccv',         label: 'Peak CCV',    category: 'viewership' as const },
  { key: 'hours_watched',    label: 'HW (시간)',   category: 'viewership' as const },
  { key: 'unique_viewers',   label: '순 시청자',   category: 'viewership' as const },
  { key: 'impressions',      label: '소셜 노출',   category: 'social'     as const },
  { key: 'engagements',      label: '소셜 반응',   category: 'social'     as const },
]

function getActual(data: EventData, metric: string): number {
  if (metric === 'peak_ccv' || metric === 'hours_watched' || metric === 'unique_viewers') {
    const total = data.viewership.find((v) => v.platform === 'total')
    if (!total) return 0
    return (total[metric as keyof ViewershipKpi] as number) ?? 0
  }
  if (metric === 'impressions' || metric === 'engagements') {
    return data.social.reduce((s, r) => s + (r[metric as keyof SocialKpi] as number), 0)
  }
  return 0
}

function getTarget(data: EventData, metric: string): number {
  return data.targets.find((t) => t.metric === metric)?.target_value ?? 0
}

export function CompareClient({ events, allData }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [selected, setSelected] = useState<string[]>(
    events.filter((e) => e.status === 'completed').slice(0, 2).map((e) => e.id)
  )

  const selectedData = selected.map((id) => allData[id]).filter(Boolean)

  // 레이더 차트 데이터 (달성률 기준)
  const radarData = METRICS.map(({ key, label }) => {
    const point: Record<string, number | string> = { metric: label }
    selectedData.forEach((d) => {
      const actual = getActual(d, key)
      const target = getTarget(d, key)
      point[d.event.name] = target > 0 ? Math.min((actual / target) * 100, 150) : 0
    })
    return point
  })

  // 트렌드 오버레이 (Peak CCV)
  const trendData = selectedData.map((d) => ({
    name: d.event.name,
    value: getActual(d, 'peak_ccv'),
  }))

  function toggleEvent(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3 ? [...prev, id] : prev
    )
  }

  return (
    <div className="space-y-8">
      {/* 이벤트 선택 */}
      <div>
        <p className="text-sm text-gray-400 mb-3">비교할 이벤트 선택 (최대 3개)</p>
        <div className="flex flex-wrap gap-2">
          {events.map((ev, i) => {
            const isSelected = selected.includes(ev.id)
            return (
              <button
                key={ev.id}
                onClick={() => toggleEvent(ev.id)}
                className={cn(
                  'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                  isSelected
                    ? 'border-transparent text-white'
                    : 'border-brand-border text-gray-400 hover:text-white hover:border-gray-500'
                )}
                style={isSelected ? { backgroundColor: EVENT_COLORS[selected.indexOf(ev.id)] + '33', borderColor: EVENT_COLORS[selected.indexOf(ev.id)] } : {}}
              >
                {ev.name}
              </button>
            )
          })}
        </div>
      </div>

      {selected.length < 2 ? (
        <p className="text-gray-500 text-sm text-center py-12">이벤트를 2개 이상 선택해주세요.</p>
      ) : (
        <>
          {/* 비교 테이블 */}
          <div className="bg-brand-surface border border-brand-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">지표</th>
                  {selectedData.map((d, i) => (
                    <th key={d.event.id} className="px-5 py-3 text-right font-medium" style={{ color: EVENT_COLORS[i] }}>
                      {d.event.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map(({ key, label }) => {
                  const actuals = selectedData.map((d) => getActual(d, key))
                  const maxVal = Math.max(...actuals)
                  return (
                    <tr key={key} className="border-b border-brand-border last:border-0 hover:bg-white/5">
                      <td className="px-5 py-3 text-gray-400">{label}</td>
                      {selectedData.map((d, i) => {
                        const actual = actuals[i]
                        const target = getTarget(d, key)
                        const { rate, status } = target > 0
                          ? calcAchievement(key, actual, target)
                          : { rate: 0, status: 'warning' as const }
                        const isMax = actual === maxVal && maxVal > 0

                        return (
                          <td
                            key={d.event.id}
                            className={cn('px-5 py-3 text-right tabular-nums', isMax && 'bg-blue-900/20')}
                          >
                            <div className="font-semibold text-white">{formatNumber(actual)}</div>
                            {target > 0 && (
                              <div className={cn('text-xs mt-0.5', {
                                'text-kpi-success': status === 'success',
                                'text-kpi-warning': status === 'warning',
                                'text-kpi-danger':  status === 'danger',
                              })}>
                                {formatPercent(rate, 1)}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 레이더 차트 */}
            <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">카테고리별 달성도</h3>
              {!mounted ? <div className="h-[280px]" /> : <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                  <PolarGrid stroke="#1F2937" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 120]} tick={{ fill: '#6B7280', fontSize: 10 }} tickCount={4} />
                  {selectedData.map((d, i) => (
                    <Radar
                      key={d.event.id}
                      name={d.event.name}
                      dataKey={d.event.name}
                      stroke={EVENT_COLORS[i]}
                      fill={EVENT_COLORS[i]}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: 8 }}
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, '']}
                  />
                </RadarChart>
              </ResponsiveContainer>}
            </div>

            {/* Peak CCV 비교 바 */}
            <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Peak CCV 비교</h3>
              <div className="space-y-4 mt-6">
                {trendData.map((d, i) => {
                  const maxVal = Math.max(...trendData.map((t) => t.value))
                  const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0
                  return (
                    <div key={d.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: EVENT_COLORS[i] }}>{d.name}</span>
                        <span className="text-white font-semibold tabular-nums">{formatNumber(d.value)}</span>
                      </div>
                      <div className="h-2 bg-brand-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: EVENT_COLORS[i] }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
