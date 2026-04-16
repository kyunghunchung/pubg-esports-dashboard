'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useDashboardData } from '@/lib/hooks/useDashboardData'
import { isGlobalEvent } from '@/lib/config/constants'
import { KpiCard } from '@/components/kpi/KpiCard'
import { formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

const CONTENT_TYPE_1_OPTIONS = ['숏폼', '롱폼', '포스트']
const CONTENT_TYPE_2_OPTIONS = ['하이라이트', '프로모션', '하이핑']

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = '전체',
  disabled = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || options.length === 0}
        className={cn(
          'bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors',
          (disabled || options.length === 0) && 'opacity-40 cursor-not-allowed',
        )}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

export default function ContentsPage() {
  const { data, loading } = useDashboardData()

  const [filterYear,    setFilterYear]    = useState('')
  const [filterEvent,   setFilterEvent]   = useState('')
  const [filterRegion,  setFilterRegion]  = useState('')
  const [filterPlatform,setFilterPlatform]= useState('')
  const [filterType1,   setFilterType1]   = useState('')
  const [filterType2,   setFilterType2]   = useState('')

  // 이벤트 옵션 (글로벌만)
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

  // 소셜 데이터 필터링
  const filteredSocial = useMemo(() => {
    if (!data) return []
    let rows = data.social

    // 연도/이벤트 필터
    const eventIds = filterEvent
      ? [filterEvent]
      : eventOptions.map(e => e.id)
    rows = rows.filter(s => eventIds.includes(s.event_id))

    // 플랫폼 필터
    if (filterPlatform) rows = rows.filter(s => s.platform === filterPlatform)

    // 지역 필터 (데이터에 region 필드가 있을 때)
    if (filterRegion) rows = rows.filter(s => s.region === filterRegion)

    // 콘텐츠 종류 필터 (데이터에 content_type 필드가 있을 때)
    if (filterType1) rows = rows.filter(s => s.content_type_1 === filterType1)
    if (filterType2) rows = rows.filter(s => s.content_type_2 === filterType2)

    return rows
  }, [data, filterEvent, eventOptions, filterPlatform, filterRegion, filterType1, filterType2])

  // KPI 집계
  const kpi = useMemo(() => ({
    content_count: filteredSocial.reduce((sum, s) => sum + (s.content_count ?? 0), 0),
    video_views:   filteredSocial.reduce((sum, s) => sum + s.video_views, 0),
    engagements:   filteredSocial.reduce((sum, s) => sum + s.engagements, 0),
    impressions:   filteredSocial.reduce((sum, s) => sum + s.impressions, 0),
  }), [filteredSocial])

  // 플랫폼 옵션 (데이터 기반)
  const platformOptions = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.social.map(s => s.platform))).sort()
  }, [data])

  // 지역 옵션 (데이터 기반)
  const regionOptions = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.social.map(s => s.region).filter(Boolean))) as string[]
  }, [data])

  if (loading && !data) return <div className="min-h-screen bg-brand-bg" />

  if (!data || !data.events.length) {
    return (
      <main className="min-h-screen bg-brand-bg text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-5xl">📂</p>
          <h2 className="text-xl font-bold">업로드된 데이터가 없습니다</h2>
          <p className="text-gray-400 text-sm">엑셀 파일을 업로드하면 콘텐츠 성과를 확인할 수 있습니다.</p>
          <Link href="/upload" className="inline-block mt-2 px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80">
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
          <h1 className="text-2xl font-bold">Contents</h1>
          <p className="text-sm text-gray-400 mt-1">소셜 채널별 콘텐츠 성과 분석</p>
        </div>

        {/* 6개 필터 */}
        <section className="bg-brand-surface border border-brand-border rounded-xl p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <FilterSelect
              label="연도"
              value={filterYear}
              onChange={v => { setFilterYear(v); setFilterEvent('') }}
              options={yearOptions}
            />
            <FilterSelect
              label="대회"
              value={filterEvent}
              onChange={setFilterEvent}
              options={eventOptions.map(e => e.id)}
              placeholder="전체"
            />
            <FilterSelect
              label="지역 (언어)"
              value={filterRegion}
              onChange={setFilterRegion}
              options={regionOptions}
              placeholder={regionOptions.length === 0 ? '데이터 없음' : '전체'}
            />
            <FilterSelect
              label="플랫폼"
              value={filterPlatform}
              onChange={setFilterPlatform}
              options={platformOptions}
            />
            <FilterSelect
              label="콘텐츠 종류 1"
              value={filterType1}
              onChange={setFilterType1}
              options={CONTENT_TYPE_1_OPTIONS}
            />
            <FilterSelect
              label="콘텐츠 종류 2"
              value={filterType2}
              onChange={setFilterType2}
              options={CONTENT_TYPE_2_OPTIONS}
            />
          </div>

          {/* 이벤트 선택을 이름으로 보여주는 영역 */}
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

        {/* KPI 카드 3개 */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Contents KPI</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="콘텐츠 수"
              value={kpi.content_count}
              unit="건"
            />
            <KpiCard
              label="조회 수"
              value={kpi.video_views}
              unit="회"
            />
            <KpiCard
              label="Engagement"
              value={kpi.engagements}
              unit="회"
            />
          </div>
        </section>

        {/* 플랫폼별 상세 테이블 */}
        {filteredSocial.length > 0 && (
          <section className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-brand-border">
              <h2 className="text-sm font-semibold text-gray-300">플랫폼별 상세</h2>
              <p className="text-xs text-gray-500 mt-0.5">총 {filteredSocial.length}개 데이터 행</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="px-5 py-3 text-left text-gray-400 font-medium">플랫폼</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">콘텐츠 수</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">노출</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">조회 수</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSocial.map((row, i) => (
                    <tr key={i} className="border-b border-brand-border last:border-0 hover:bg-white/5">
                      <td className="px-5 py-3 text-white font-medium capitalize">{row.platform}</td>
                      <td className="px-5 py-3 text-right text-gray-300 tabular-nums">{row.content_count != null ? formatNumber(row.content_count) : '—'}</td>
                      <td className="px-5 py-3 text-right text-gray-300 tabular-nums">{formatNumber(row.impressions)}</td>
                      <td className="px-5 py-3 text-right text-gray-300 tabular-nums">{formatNumber(row.video_views)}</td>
                      <td className="px-5 py-3 text-right text-gray-300 tabular-nums">{formatNumber(row.engagements)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {filteredSocial.length === 0 && (
          <div className="text-center py-16 text-gray-500 text-sm">
            조건에 맞는 데이터가 없습니다.
          </div>
        )}

      </div>
    </main>
  )
}
