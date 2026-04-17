'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useDashboardData } from '@/lib/hooks/useDashboardData'
import { isGlobalEvent } from '@/lib/config/constants'
import { getCostreamingAggregated } from '@/lib/store'
import { formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = '전체',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

function KpiGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{children}</div>
    </div>
  )
}

function StatCard({
  label,
  value,
  unit,
  caption,
  disabled,
}: {
  label: string
  value?: number | null
  unit?: string
  caption?: string
  disabled?: boolean
}) {
  return (
    <div className={cn(
      'bg-brand-surface border border-brand-border rounded-xl p-5 space-y-2',
      disabled && 'opacity-50',
    )}>
      <p className="text-sm text-gray-400 font-medium">{label}</p>
      <div>
        {disabled || value == null ? (
          <span className="text-3xl font-bold tabular-nums text-gray-500">—</span>
        ) : (
          <>
            <span className="text-3xl font-bold tabular-nums text-white">{formatNumber(value)}</span>
            {unit && <span className="ml-1 text-sm text-gray-400">{unit}</span>}
          </>
        )}
      </div>
      {caption && (
        <p className="text-xs text-gray-600 leading-relaxed">{caption}</p>
      )}
    </div>
  )
}

export default function CostreamingPage() {
  const { data, loading } = useDashboardData()

  const [filterYear,   setFilterYear]   = useState('')
  const [filterEvent,  setFilterEvent]  = useState('')
  const [filterRegion, setFilterRegion] = useState('')

  const globalEvents = useMemo(() => {
    if (!data) return []
    const globals = data.events.filter(e => isGlobalEvent(e.type))
    return globals.length > 0 ? globals : data.events
  }, [data])

  const yearOptions = useMemo(() =>
    Array.from(new Set(globalEvents.map(e => String(e.year)))).sort((a, b) => Number(b) - Number(a)),
    [globalEvents]
  )

  const eventOptions = useMemo(() =>
    globalEvents
      .filter(e => !filterYear || String(e.year) === filterYear)
      .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [globalEvents, filterYear]
  )

  const regionOptions = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.broadcast.map(b => b.region).filter(Boolean))) as string[]
  }, [data])

  // 필터 적용된 이벤트 ID 목록
  const filteredEventIds = useMemo(() => {
    if (filterEvent) return [filterEvent]
    return eventOptions.map(e => e.id)
  }, [filterEvent, eventOptions])

  // KPI 집계
  const coKpi = useMemo(() => {
    if (!data) return null
    return getCostreamingAggregated(data, filteredEventIds, filterRegion || undefined)
  }, [data, filteredEventIds, filterRegion])

  const avgPeakView = coKpi && coKpi.streamer_count > 0
    ? Math.round(coKpi.peak_view_sum / coKpi.streamer_count)
    : null

  const roi = coKpi && coKpi.total_cost_usd > 0 && coKpi.peak_view_sum > 0
    ? coKpi.total_cost_usd / coKpi.peak_view_sum
    : null

  if (loading && !data) return <div className="min-h-screen bg-brand-bg" />

  if (!data || !data.events.length) {
    return (
      <main className="min-h-screen bg-brand-bg text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-5xl">📂</p>
          <h2 className="text-xl font-bold">업로드된 데이터가 없습니다</h2>
          <p className="text-gray-400 text-sm">엑셀 파일을 업로드하면 코스트리밍 성과를 확인할 수 있습니다.</p>
          <Link href="/data-upload" className="inline-block mt-2 px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80">
            데이터 업로드 →
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold">Co-streaming</h1>
          <p className="text-sm text-gray-400 mt-1">코스트리밍 스트리머 참여 현황 및 시청자 지표</p>
        </div>

        {/* 3개 필터 */}
        <section className="bg-brand-surface border border-brand-border rounded-xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FilterSelect
              label="연도"
              value={filterYear}
              onChange={v => { setFilterYear(v); setFilterEvent('') }}
              options={yearOptions}
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">대회</label>
              <select
                value={filterEvent}
                onChange={e => setFilterEvent(e.target.value)}
                className="bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
              >
                <option value="">전체</option>
                {eventOptions.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <FilterSelect
              label="지역 (언어)"
              value={filterRegion}
              onChange={setFilterRegion}
              options={regionOptions}
              placeholder={regionOptions.length === 0 ? '데이터 없음' : '전체'}
            />
          </div>
          {filterEvent && (
            <div className="mt-3 pt-3 border-t border-brand-border">
              <p className="text-xs text-gray-400">
                선택 이벤트: <span className="text-white font-medium">
                  {data.events.find(e => e.id === filterEvent)?.name ?? filterEvent}
                </span>
              </p>
            </div>
          )}
        </section>

        {/* ── 그룹 1: 스트리머 규모 ── */}
        <KpiGroup title="스트리머 규모">
          <StatCard
            label="스트리머 수"
            value={coKpi?.streamer_count}
            unit="명"
          />
        </KpiGroup>

        {/* ── 그룹 2: 시청자 지표 ── */}
        <KpiGroup title="시청자 지표">
          <StatCard
            label="Peak View 합산"
            value={coKpi?.peak_view_sum}
            unit="명"
            caption="※ 스트리머별 피크 시간대가 상이하므로 동시 달성 수치가 아닙니다."
          />
          <StatCard
            label="ACCV"
            value={coKpi?.acv && coKpi.acv > 0 ? Math.round(coKpi.acv) : null}
            unit="명"
            caption="Average Concurrent Viewers"
          />
          <StatCard
            label="평균 Peak View"
            value={avgPeakView}
            unit="명"
            caption="Peak View 합산 ÷ 스트리머 수"
          />
        </KpiGroup>

        {/* ── 그룹 3: ROI ── */}
        <KpiGroup title="ROI">
          <StatCard
            label="언어별 ROI"
            value={roi != null ? Math.round(roi * 100) / 100 : null}
            unit="USD/명"
            caption="코스트리밍 지출 비용 ÷ 총 시청자 수. 비용 데이터 업로드 후 활성화됩니다."
            disabled={roi == null}
          />
        </KpiGroup>

        {/* 이벤트별 상세 테이블 */}
        {data.broadcast.filter(b => filteredEventIds.includes(b.event_id)).length > 0 && (
          <section className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-brand-border">
              <h2 className="text-sm font-semibold text-gray-300">이벤트별 상세</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="px-5 py-3 text-left text-gray-400 font-medium">이벤트</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">스트리머 수</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">Peak View 합산</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">지역</th>
                  </tr>
                </thead>
                <tbody>
                  {data.broadcast
                    .filter(b => {
                      if (!filteredEventIds.includes(b.event_id)) return false
                      if (filterRegion && b.region !== filterRegion) return false
                      return true
                    })
                    .map((row, i) => {
                      const event = data.events.find(e => e.id === row.event_id)
                      return (
                        <tr key={i} className="border-b border-brand-border last:border-0 hover:bg-white/5">
                          <td className="px-5 py-3 text-white font-medium">{event?.name ?? '—'}</td>
                          <td className="px-5 py-3 text-right text-gray-300 tabular-nums">
                            {row.co_streamer_count != null ? formatNumber(row.co_streamer_count) : '—'}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-300 tabular-nums">
                            {row.co_streamer_viewers != null ? formatNumber(row.co_streamer_viewers) : '—'}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-300">{row.region ?? '—'}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </main>
  )
}
