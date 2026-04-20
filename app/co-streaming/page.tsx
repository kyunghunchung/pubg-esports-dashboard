'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useDashboardData } from '@/lib/hooks/useDashboardData'
import {
  getAllYears,
  getEventsByYear,
  getDisplayName,
} from '@/lib/config/event-master'
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
  label, value, unit, caption, disabled,
}: {
  label: string; value?: number | null; unit?: string; caption?: string; disabled?: boolean
}) {
  return (
    <div className={cn('bg-brand-surface border border-brand-border rounded-xl p-5 space-y-2', disabled && 'opacity-50')}>
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
      {caption && <p className="text-xs text-gray-600 leading-relaxed">{caption}</p>}
    </div>
  )
}

export default function CostreamingPage() {
  const { data, loading } = useDashboardData()

  const [filterYear,   setFilterYear]   = useState('')
  const [filterEvent,  setFilterEvent]  = useState('')  // EVENT_MASTER event_id
  const [filterRegion, setFilterRegion] = useState('')

  // 연도 옵션 — EVENT_MASTER 기준
  const yearOptions = getAllYears().map(String)

  // 대회 옵션 — 선택 연도의 EVENT_MASTER 항목
  const eventOptions = useMemo(() =>
    filterYear ? getEventsByYear(Number(filterYear)) : [],
    [filterYear]
  )

  // event_id → Supabase UUID
  const toUUID = (eid: string) => data?.events.find(e => e.name === eid)?.id

  // 필터 적용된 Supabase UUID 목록
  const filteredUUIDs = useMemo(() => {
    if (!data) return []
    if (filterEvent) {
      const uuid = toUUID(filterEvent)
      return uuid ? [uuid] : []
    }
    if (filterYear) {
      return getEventsByYear(Number(filterYear))
        .map(e => toUUID(e.event_id))
        .filter((id): id is string => Boolean(id))
    }
    return data.events.map(e => e.id)
  }, [data, filterEvent, filterYear]) // eslint-disable-line react-hooks/exhaustive-deps

  const regionOptions = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.costreaming.map(b => b.region).filter(Boolean))) as string[]
  }, [data])

  const coKpi = useMemo(() => {
    if (!data) return null
    return getCostreamingAggregated(data, filteredUUIDs, filterRegion || undefined)
  }, [data, filteredUUIDs, filterRegion])

  const avgPeakView = coKpi && coKpi.streamer_count > 0
    ? Math.round(coKpi.peak_view_sum / coKpi.streamer_count)
    : null

  const roi = coKpi && coKpi.total_cost_usd > 0 && coKpi.peak_view_sum > 0
    ? coKpi.total_cost_usd / coKpi.peak_view_sum
    : null

  if (loading && !data) return <div className="min-h-screen bg-brand-bg" />

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold">Co-streaming</h1>
          <p className="text-sm text-gray-400 mt-1">코스트리밍 스트리머 참여 현황 및 시청자 지표</p>
        </div>

        {/* 데이터 없음 안내 */}
        {!data?.events.length && (
          <div className="bg-brand-surface border border-brand-border rounded-xl p-6 flex items-center justify-between">
            <p className="text-sm text-gray-400">업로드된 데이터가 없습니다.</p>
            <Link href="/data-upload" className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80">
              데이터 업로드 →
            </Link>
          </div>
        )}

        {/* 3개 필터 */}
        <section className="bg-brand-surface border border-brand-border rounded-xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 연도 */}
            <FilterSelect
              label="연도"
              value={filterYear}
              onChange={v => { setFilterYear(v); setFilterEvent('') }}
              options={yearOptions}
            />
            {/* 대회 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">대회</label>
              <select
                value={filterEvent}
                onChange={e => setFilterEvent(e.target.value)}
                disabled={eventOptions.length === 0}
                className={cn(
                  'bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors',
                  eventOptions.length === 0 && 'opacity-40 cursor-not-allowed',
                )}
              >
                <option value="">전체</option>
                {eventOptions.map(e => (
                  <option key={e.event_id} value={e.event_id}>{e.display_name}</option>
                ))}
              </select>
            </div>
            {/* 지역 */}
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
                선택 이벤트: <span className="text-white font-medium">{getDisplayName(filterEvent)}</span>
              </p>
            </div>
          )}
        </section>

        {/* KPI 그룹 1: 스트리머 규모 */}
        <KpiGroup title="스트리머 규모">
          <StatCard label="스트리머 수" value={coKpi?.streamer_count} unit="명" />
        </KpiGroup>

        {/* KPI 그룹 2: 시청자 지표 */}
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

        {/* KPI 그룹 3: ROI */}
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
        {data && data.costreaming.filter(b => filteredUUIDs.includes(b.event_id)).length > 0 && (
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
                  {data.costreaming
                    .filter(b => {
                      if (!filteredUUIDs.includes(b.event_id)) return false
                      if (filterRegion && b.region !== filterRegion) return false
                      return true
                    })
                    .map((row, i) => {
                      const eventName = data.events.find(e => e.id === row.event_id)?.name
                      return (
                        <tr key={i} className="border-b border-brand-border last:border-0 hover:bg-white/5">
                          <td className="px-5 py-3 text-white font-medium">
                            {eventName ? getDisplayName(eventName) : '—'}
                          </td>
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
