'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useDashboardData } from '@/lib/hooks/useDashboardData'
import {
  getAllYears,
  getEventsByYear,
  getDisplayName,
} from '@/lib/config/event-master'
import { KpiCard } from '@/components/kpi/KpiCard'
import { getSocialTrend, hasSocialDateData } from '@/lib/store'
import { formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const ContentsTrendChart = dynamic(
  () => import('@/components/charts/ContentsTrendChart').then(m => m.ContentsTrendChart),
  { ssr: false },
)


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
  options: { value: string; label: string }[] | string[]
  placeholder?: string
  disabled?: boolean
}) {
  const normalized = (options as (string | { value: string; label: string })[]).map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  )
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || normalized.length === 0}
        className={cn(
          'bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors',
          (disabled || normalized.length === 0) && 'opacity-40 cursor-not-allowed',
        )}
      >
        <option value="">{placeholder}</option>
        {normalized.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export default function ContentsPage() {
  const { data, loading } = useDashboardData()

  const [filterYear,     setFilterYear]     = useState('')
  const [filterEvent,    setFilterEvent]    = useState('')  // EVENT_MASTER event_id
  const [filterRegion,   setFilterRegion]   = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterType1,    setFilterType1]    = useState('')
  const [filterType2,    setFilterType2]    = useState('')

  // 트렌드 뷰 상태
  const [trendPeriod,  setTrendPeriod]  = useState<'monthly' | 'weekly'>('monthly')
  const [trendMetric,  setTrendMetric]  = useState<'impressions' | 'content_count' | 'engagements' | 'video_views'>('impressions')

  // 연도 옵션 — EVENT_MASTER 기준
  const yearOptions = getAllYears()

  // 대회 옵션 — 선택 연도의 EVENT_MASTER 항목
  const eventOptions = useMemo(() =>
    filterYear
      ? getEventsByYear(Number(filterYear))
      : [],
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

  // 소셜 데이터 필터링
  const filteredSocial = useMemo(() => {
    if (!data) return []
    let rows = data.social.filter(s => filteredUUIDs.includes(s.event_id))
    if (filterPlatform) rows = rows.filter(s => s.platform === filterPlatform)
    if (filterRegion)   rows = rows.filter(s => s.region === filterRegion)
    if (filterType1)    rows = rows.filter(s => s.content_type_1 === filterType1)
    if (filterType2)    rows = rows.filter(s => s.content_type_2 === filterType2)
    return rows
  }, [data, filteredUUIDs, filterPlatform, filterRegion, filterType1, filterType2])

  const kpi = useMemo(() => ({
    content_count: filteredSocial.reduce((sum, s) => sum + (s.content_count ?? 0), 0),
    video_views:   filteredSocial.reduce((sum, s) => sum + s.video_views, 0),
    engagements:   filteredSocial.reduce((sum, s) => sum + s.engagements, 0),
    impressions:   filteredSocial.reduce((sum, s) => sum + s.impressions, 0),
  }), [filteredSocial])

  const platformOptions = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.social.map(s => s.platform))).sort()
  }, [data])

  const regionOptions = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.social.map(s => s.region).filter(Boolean))) as string[]
  }, [data])

  const type1Options = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.social.map(s => s.content_type_1).filter(Boolean))) as string[]
  }, [data])

  const type2Options = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.social.map(s => s.content_type_2).filter(Boolean))) as string[]
  }, [data])

  // 트렌드 데이터 (필터 적용)
  const hasDateData = useMemo(() =>
    data ? hasSocialDateData(data, filteredUUIDs) : false,
    [data, filteredUUIDs]
  )

  const trendData = useMemo(() => {
    if (!data || !hasDateData) return []
    return getSocialTrend(data, filteredUUIDs, trendPeriod, {
      platform:       filterPlatform || undefined,
      region:         filterRegion   || undefined,
      content_type_1: filterType1    || undefined,
      content_type_2: filterType2    || undefined,
    })
  }, [data, filteredUUIDs, trendPeriod, filterPlatform, filterRegion, filterType1, filterType2, hasDateData])

  if (loading && !data) return <div className="min-h-screen bg-brand-bg" />

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold">Contents</h1>
          <p className="text-sm text-gray-400 mt-1">소셜 채널별 콘텐츠 성과 분석</p>
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

        {/* 6개 필터 */}
        <section className="bg-brand-surface border border-brand-border rounded-xl p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* 연도 */}
            <FilterSelect
              label="연도"
              value={filterYear}
              onChange={v => { setFilterYear(v); setFilterEvent('') }}
              options={yearOptions.map(y => ({ value: String(y), label: String(y) }))}
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
            {/* 플랫폼 */}
            <FilterSelect
              label="플랫폼"
              value={filterPlatform}
              onChange={setFilterPlatform}
              options={platformOptions}
            />
            {/* 콘텐츠 종류 1 */}
            <FilterSelect
              label="콘텐츠 종류 1"
              value={filterType1}
              onChange={setFilterType1}
              options={type1Options}
              placeholder={type1Options.length === 0 ? '데이터 없음' : '전체'}
            />
            {/* 콘텐츠 종류 2 */}
            <FilterSelect
              label="콘텐츠 종류 2"
              value={filterType2}
              onChange={setFilterType2}
              options={type2Options}
              placeholder={type2Options.length === 0 ? '데이터 없음' : '전체'}
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

        {/* KPI 카드 3개 */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Contents KPI</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Number of Contents" value={kpi.content_count} unit="건" />
            <KpiCard label="Views"              value={kpi.video_views}   unit="회" />
            <KpiCard label="Engagement"         value={kpi.engagements}   unit="회" />
          </div>
        </section>

        {/* 기간별 트렌드 */}
        {hasDateData ? (
          <section className="bg-brand-surface border border-brand-border rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-300">기간별 트렌드</h2>
                <p className="text-xs text-gray-500 mt-0.5">날짜 데이터가 있는 경우에만 표시됩니다</p>
              </div>
              <div className="flex items-center gap-2">
                {/* 주기 토글 */}
                <div className="flex rounded-lg border border-brand-border overflow-hidden">
                  {(['monthly', 'weekly'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setTrendPeriod(p)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium transition-colors',
                        trendPeriod === p
                          ? 'bg-brand-accent text-white'
                          : 'text-gray-400 hover:text-white'
                      )}
                    >
                      {p === 'monthly' ? '월간' : '주간'}
                    </button>
                  ))}
                </div>
                {/* 지표 선택 */}
                <select
                  value={trendMetric}
                  onChange={e => setTrendMetric(e.target.value as typeof trendMetric)}
                  className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                >
                  <option value="impressions">노출수</option>
                  <option value="content_count">Number of Contents</option>
                  <option value="video_views">조회수</option>
                  <option value="engagements">Engagement</option>
                </select>
              </div>
            </div>
            <ContentsTrendChart data={trendData} metric={trendMetric} period={trendPeriod} />
          </section>
        ) : (
          data && filteredUUIDs.length > 0 && (
            <section className="bg-brand-surface border border-brand-border rounded-xl p-5 flex items-center gap-3">
              <span className="text-gray-500 text-sm">기간별 트렌드를 보려면 Contents 템플릿에 <code className="bg-brand-bg px-1.5 py-0.5 rounded text-xs text-gray-300">Date</code> 컬럼을 채워서 업로드하세요.</span>
            </section>
          )
        )}

        {/* 플랫폼별 상세 테이블 */}
        {filteredSocial.length > 0 ? (
          <section className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-brand-border">
              <h2 className="text-sm font-semibold text-gray-300">플랫폼별 상세</h2>
              <p className="text-xs text-gray-500 mt-0.5">총 {filteredSocial.length}개 데이터 행</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="px-5 py-3 text-left text-gray-400 font-medium">이벤트</th>
                    <th className="px-5 py-3 text-left text-gray-400 font-medium">플랫폼</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">콘텐츠 수</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">노출</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">조회 수</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSocial.map((row, i) => {
                    const eventName = data?.events.find(e => e.id === row.event_id)?.name
                    return (
                      <tr key={i} className="border-b border-brand-border last:border-0 hover:bg-white/5">
                        <td className="px-5 py-3 text-gray-400 text-xs">{eventName ? getDisplayName(eventName) : '—'}</td>
                        <td className="px-5 py-3 text-white font-medium capitalize">{row.platform}</td>
                        <td className="px-5 py-3 text-right text-gray-300 tabular-nums">{row.content_count != null ? formatNumber(row.content_count) : '—'}</td>
                        <td className="px-5 py-3 text-right text-gray-300 tabular-nums">{formatNumber(row.impressions)}</td>
                        <td className="px-5 py-3 text-right text-gray-300 tabular-nums">{formatNumber(row.video_views)}</td>
                        <td className="px-5 py-3 text-right text-gray-300 tabular-nums">{formatNumber(row.engagements)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <div className="text-center py-16 text-gray-500 text-sm">
            조건에 맞는 데이터가 없습니다.
          </div>
        )}

      </div>
    </main>
  )
}
