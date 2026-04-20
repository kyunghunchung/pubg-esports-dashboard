'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  getViewershipTotal,
  getViewershipByPlatform,
  getViewershipDataType,
  getContentAggregated,
  getSocialAggregatedByPlatform,
  getSocialTrend,
  hasSocialDateData,
} from '@/lib/store'
import { useDashboardData } from '@/lib/hooks/useDashboardData'
import {
  getAllYears,
  getGlobalEventsByYear,
  getDisplayName,
} from '@/lib/config/event-master'
import { KpiCard } from '@/components/kpi/KpiCard'
import { TournamentFilter } from '@/components/dashboard/TournamentFilter'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const PlatformCcvChart = dynamic(
  () => import('@/components/charts/PlatformCcvChart').then(m => m.PlatformCcvChart),
  { ssr: false },
)
const SocialPlatformChart = dynamic(
  () => import('@/components/charts/SocialPlatformChart').then(m => m.SocialPlatformChart),
  { ssr: false },
)
const ContentsTrendChart = dynamic(
  () => import('@/components/charts/ContentsTrendChart').then(m => m.ContentsTrendChart),
  { ssr: false },
)

export default function DashboardPage() {
  const { data, loading } = useDashboardData()

  // selectedIds — localStorage에 유지해서 네비게이션 후에도 선택 유지
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('dashboard_selected_ids')
      if (saved) return JSON.parse(saved) as string[]
    } catch { /* ignore */ }
    return []
  })
  const [trendPeriod, setTrendPeriod] = useState<'monthly' | 'weekly'>('monthly')
  const [trendMetric, setTrendMetric] = useState<'impressions' | 'content_count' | 'engagements' | 'video_views'>('impressions')

  function updateSelectedIds(ids: string[]) {
    setSelectedIds(ids)
    try { localStorage.setItem('dashboard_selected_ids', JSON.stringify(ids)) } catch { /* ignore */ }
  }

  // 기본 선택: 최신 연도 첫 번째 글로벌 이벤트 (EVENT_MASTER 기준) — 저장된 값 없을 때만
  useEffect(() => {
    const years = getAllYears()
    if (!years.length) return
    const allMasterIds = getAllYears().flatMap(y => getGlobalEventsByYear(y).map(e => e.event_id))
    const stillValid = selectedIds.length > 0 && selectedIds.every(id => allMasterIds.includes(id))
    if (!stillValid) {
      const latestYear = years[0]
      const globals = getGlobalEventsByYear(latestYear)
      updateSelectedIds(globals.length > 0 ? [globals[0].event_id] : [])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // data 로드 후 선택된 이벤트가 실제 업로드 데이터에 없으면 첫 번째 유효 이벤트로 리셋
  useEffect(() => {
    if (!data?.events.length || !selectedIds.length) return
    const validNames = new Set(data.events.map(e => e.name))
    const hasMatch = selectedIds.some(id => validNames.has(id))
    if (!hasMatch) {
      const years = getAllYears()
      const latestYear = years[0]
      const globals = getGlobalEventsByYear(latestYear)
      const firstValid = globals.find(e => validNames.has(e.event_id))
      updateSelectedIds(firstValid ? [firstValid.event_id] : [data.events[0].name])
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hooks (early return 이전에 모두 선언) ──
  const selectedUUIDs = useMemo(
    () => selectedIds.map((eid: string) => data?.events.find(e => e.name === eid)?.id).filter((id): id is string => Boolean(id)),
    [data, selectedIds],
  )
  const hasDateData = useMemo(
    () => data ? hasSocialDateData(data, selectedUUIDs) : false,
    [data, selectedUUIDs],
  )
  const trendData = useMemo(() => {
    if (!data || !hasDateData) return []
    return getSocialTrend(data, selectedUUIDs, trendPeriod)
  }, [data, selectedUUIDs, trendPeriod, hasDateData])

  if (loading && !data) return <div className="min-h-screen bg-brand-bg" />

  // 데이터 없어도 필터는 EVENT_MASTER 기준으로 렌더링
  const isSingleEvent = selectedIds.length === 1
  const singleEventId = isSingleEvent ? selectedIds[0] : null

  // event_id → Supabase UUID 매핑 (KPI 쿼리용)
  const toUUID = (eid: string) => data?.events.find(e => e.name === eid)?.id
  const singleUUID = singleEventId ? (toUUID(singleEventId) ?? null) : null

  // ── Viewership KPI (단일 이벤트 + Supabase UUID 있을 때만) ──
  const total          = singleUUID ? getViewershipTotal(data!, singleUUID) : null
  const byPlatform     = singleUUID ? getViewershipByPlatform(data!, singleUUID) : []
  const viewershipType = singleUUID ? getViewershipDataType(data!, singleUUID) : 'none'
  const isTypeBData = viewershipType === 'B'

  const pccv = total?.peak_ccv ?? 0
  const accv = total?.acv ?? 0
  const stabilityRatio = pccv > 0 ? Math.round((accv / pccv) * 100) : null

  // ── Contents KPI ──
  const content = data ? getContentAggregated(data, selectedUUIDs) : { impressions: 0, content_count: 0 }

  // ── 차트 데이터 ──
  const ccvChartData = byPlatform.map(v => ({
    platform: v.platform,
    peak_ccv: v.peak_ccv ?? 0,
  }))
  const socialChartData = data ? getSocialAggregatedByPlatform(data, selectedUUIDs) : []

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold">PUBG Esports Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            {singleEventId
              ? getDisplayName(singleEventId)
              : `${selectedIds.length}개 이벤트 선택됨`}
            {data && (
              <span className="ml-2 text-xs text-gray-500">
                업로드: {new Date(data.uploadedAt).toLocaleDateString('ko-KR')}
              </span>
            )}
          </p>
        </div>

        {/* 필터 (EVENT_MASTER 기준, 데이터 없어도 표시) */}
        <TournamentFilter
          selectedIds={selectedIds}
          onChange={updateSelectedIds}
        />

        {/* 데이터 미업로드 안내 (필터 아래에 배치) */}
        {!data?.events.length && (
          <div className="bg-brand-surface border border-brand-border rounded-xl p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">업로드된 데이터가 없습니다</p>
              <p className="text-xs text-gray-500 mt-0.5">엑셀 파일을 업로드하면 KPI 카드가 채워집니다.</p>
            </div>
            <Link
              href="/data-upload"
              className="shrink-0 px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 transition-all"
            >
              데이터 업로드 →
            </Link>
          </div>
        )}

        {/* ── 섹션 A: Viewership KPI ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Viewership
            </h2>
            {!isSingleEvent && (
              <span className="text-xs text-gray-600 bg-brand-surface border border-brand-border px-2 py-0.5 rounded-full">
                단일 이벤트를 선택해주세요
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              label="PCCV"
              sublabel="Peak Concurrent Viewers"
              value={pccv}
              unit="명"
              disabled={!isSingleEvent}
              caption={isTypeBData ? '※ 플랫폼별 PCCV 합산 수치입니다' : undefined}
            />
            <KpiCard
              label="ACCV"
              sublabel="Average Concurrent Viewers"
              value={accv}
              unit="명"
              disabled={!isSingleEvent}
            />
            <KpiCard
              label="UV"
              sublabel="Unique Viewers"
              value={total?.unique_viewers ?? 0}
              unit="명"
              disabled={!isSingleEvent}
            />
            <KpiCard
              label="Stability Ratio"
              sublabel="ACCV ÷ PCCV"
              tooltip="끝까지 남은 시청자 비율 — 코어팬 지표"
              value={stabilityRatio ?? 0}
              unit="%"
              disabled={!isSingleEvent}
              badge={
                stabilityRatio !== null
                  ? stabilityRatio >= 70 ? { text: '안정적', color: 'green' }
                  : stabilityRatio >= 50 ? { text: '보통',   color: 'yellow' }
                  :                        { text: '편차 큼', color: 'red' }
                  : undefined
              }
            />
          </div>
        </section>

        {/* ── 섹션 B: Contents KPI ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Contents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiCard label="Number of Contents" value={content.content_count} unit="건" />
            <KpiCard label="Impression"         value={content.impressions}   unit="회" />
          </div>

          {/* 기간별 트렌드 — Date 데이터 있을 때만 */}
          {hasDateData ? (
            <div className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-4 mt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-300">기간별 트렌드</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-brand-border overflow-hidden">
                    {(['monthly', 'weekly'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setTrendPeriod(p)}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium transition-colors',
                          trendPeriod === p ? 'bg-brand-accent text-white' : 'text-gray-400 hover:text-white'
                        )}
                      >
                        {p === 'monthly' ? '월간' : '주간'}
                      </button>
                    ))}
                  </div>
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
            </div>
          ) : null}
        </section>

        {/* ── 차트 1: 플랫폼별 PCCV ── */}
        {isSingleEvent ? (
          isTypeBData && ccvChartData.length > 0 ? (
            <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-300">플랫폼별 PCCV</h2>
                <p className="text-xs text-gray-500 mt-0.5">{singleEventId ? getDisplayName(singleEventId) : ''}</p>
              </div>
              <PlatformCcvChart data={ccvChartData} />
            </section>
          ) : viewershipType === 'A' ? (
            <section className="bg-brand-surface border border-brand-border rounded-xl p-6 flex items-center justify-center h-32">
              <p className="text-sm text-gray-500">플랫폼별 데이터가 없습니다 (통합 데이터만 업로드됨)</p>
            </section>
          ) : null
        ) : (
          <section className="bg-brand-surface border border-brand-border rounded-xl p-6 flex items-center justify-center h-32">
            <p className="text-sm text-gray-500">단일 이벤트를 선택하면 플랫폼별 CCV 차트가 표시됩니다.</p>
          </section>
        )}

        {/* ── 차트 2: 소셜 채널별 성과 ── */}
        {socialChartData.length > 0 && (
          <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-300">소셜 채널별 성과</h2>
              <p className="text-xs text-gray-500 mt-0.5">플랫폼별 노출 · 반응 · 영상뷰 (선택 이벤트 합산)</p>
            </div>
            <SocialPlatformChart data={socialChartData} />
          </section>
        )}

      </div>
    </main>
  )
}
