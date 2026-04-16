'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  getViewershipTotal,
  getViewershipByPlatform,
  getKpiTargets,
  getContentAggregated,
} from '@/lib/store'
import { useDashboardData } from '@/lib/hooks/useDashboardData'
import { isGlobalEvent } from '@/lib/config/constants'
import { KpiCard } from '@/components/kpi/KpiCard'
import { TournamentFilter } from '@/components/dashboard/TournamentFilter'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ViewershipTab } from '@/components/event-tabs/ViewershipTab'
import dynamic from 'next/dynamic'

const PlatformCcvChart = dynamic(
  () => import('@/components/charts/PlatformCcvChart').then(m => m.PlatformCcvChart),
  { ssr: false },
)
const SocialPlatformChart = dynamic(
  () => import('@/components/charts/SocialPlatformChart').then(m => m.SocialPlatformChart),
  { ssr: false },
)

export default function DashboardPage() {
  const { data, loading } = useDashboardData()
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!data?.events?.length) return

    // 글로벌 이벤트 필터
    const globals = data.events.filter(e => isGlobalEvent(e.type))
    const display = globals.length > 0 ? globals : data.events

    // 초기값: 가장 최근 연도의 모든 이벤트
    const years = Array.from(new Set(display.map(e => e.year))).sort((a, b) => b - a)
    const latestYear = years[0]
    const latestIds = display
      .filter(e => e.year === latestYear)
      .map(e => e.id)

    // 현재 선택된 ID가 유효하면 유지, 아니면 초기화
    const allIds = display.map(e => e.id)
    const stillValid = selectedIds.length > 0 && selectedIds.every(id => allIds.includes(id))
    if (!stillValid) setSelectedIds(latestIds)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) return <div className="min-h-screen bg-brand-bg" />

  if (!data || !data.events.length) {
    return (
      <main className="min-h-screen bg-brand-bg text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-5xl">📂</p>
          <h2 className="text-xl font-bold">업로드된 데이터가 없습니다</h2>
          <p className="text-gray-400 text-sm">엑셀 파일을 업로드하면 대시보드가 채워집니다.</p>
          <Link
            href="/upload"
            className="inline-block mt-2 px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 transition-all"
          >
            데이터 업로드 →
          </Link>
        </div>
      </main>
    )
  }

  // 단일 이벤트 선택 여부
  const isSingleEvent = selectedIds.length === 1
  const singleEvent   = isSingleEvent ? data.events.find(e => e.id === selectedIds[0]) : null

  // ── 뷰어십 KPI (단일 이벤트만) ──────────────────────────────
  const total        = isSingleEvent ? getViewershipTotal(data, selectedIds[0]) : null
  const byPlatform   = isSingleEvent ? getViewershipByPlatform(data, selectedIds[0]) : []
  const targets      = isSingleEvent ? getKpiTargets(data, selectedIds[0]) : []

  const peakCcv       = total?.peak_ccv      ?? 0
  const uniqueViewers = total?.unique_viewers ?? 0
  const hoursWatched  = total?.hours_watched  ?? 0

  const getTarget = (metric: string) =>
    targets.find(t => t.metric === metric)?.target_value

  // ── 콘텐츠 KPI (복수 이벤트 집계) ──────────────────────────
  const content = getContentAggregated(data, selectedIds)

  // ── 차트 데이터 (단일 이벤트만) ──────────────────────────────
  const ccvChartData = byPlatform.map(v => ({
    platform: v.platform,
    peak_ccv: v.peak_ccv ?? 0,
  }))

  // ── 뷰어십 탭 데이터 ─────────────────────────────────────────
  const viewershipTabData = isSingleEvent
    ? data.viewership.filter(v => v.event_id === selectedIds[0])
    : []

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold">PUBG Esports 대시보드</h1>
          <p className="text-sm text-gray-400 mt-1">
            {singleEvent
              ? `${singleEvent.name}${singleEvent.venue ? ` · ${singleEvent.venue}` : ''}`
              : `${selectedIds.length}개 이벤트 선택됨`}
            <span className="ml-2 text-xs text-gray-500">
              업로드: {new Date(data.uploadedAt).toLocaleDateString('ko-KR')}
            </span>
          </p>
        </div>

        {/* 연도 탭 + 이벤트 버튼 */}
        <TournamentFilter
          events={data.events}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />

        {/* ── KPI 카드 ── */}
        <div className="space-y-4">

          {/* 뷰어십 섹션 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">뷰어십</h2>
              {!isSingleEvent && (
                <span className="text-xs text-gray-600 bg-brand-surface border border-brand-border px-2 py-0.5 rounded-full">
                  단일 이벤트 선택 시 표시
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard
                label="Peak CCV"
                value={peakCcv}
                unit="명"
                target={getTarget('peak_ccv')}
                disabled={!isSingleEvent}
              />
              <KpiCard
                label="Unique Viewers"
                value={uniqueViewers}
                unit="명"
                target={getTarget('unique_viewers')}
                disabled={!isSingleEvent}
              />
              <KpiCard
                label="Total Hours Watched"
                value={hoursWatched}
                unit="시간"
                target={getTarget('hours_watched')}
                disabled={!isSingleEvent}
              />
            </div>
          </div>

          {/* 콘텐츠 섹션 */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">콘텐츠</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KpiCard
                label="노출 (Impression)"
                value={content.impressions}
                unit="회"
              />
              <KpiCard
                label="콘텐츠 발행 수"
                value={content.content_count}
                unit="건"
              />
            </div>
          </div>
        </div>

        {/* 플랫폼별 CCV (단일 이벤트) */}
        {isSingleEvent && ccvChartData.length > 0 && (
          <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-300">플랫폼별 Peak CCV</h2>
              <p className="text-xs text-gray-500 mt-0.5">{singleEvent?.name}</p>
            </div>
            <PlatformCcvChart data={ccvChartData} />
          </section>
        )}

        {/* ── 하단 탭 섹션 ── */}
        <section>
          <Tabs defaultValue="viewership">
            <TabsList>
              <TabsTrigger value="viewership">Viewership</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="costreaming">Co-streaming</TabsTrigger>
              <TabsTrigger value="upload">Data Upload</TabsTrigger>
            </TabsList>

            {/* Viewership 탭 */}
            <TabsContent value="viewership">
              {isSingleEvent && viewershipTabData.length > 0 ? (
                <ViewershipTab
                  viewership={viewershipTabData}
                  targets={targets}
                />
              ) : (
                <div className="py-16 text-center text-gray-500 text-sm bg-brand-surface border border-brand-border rounded-xl">
                  {isSingleEvent
                    ? '선택한 이벤트의 뷰어십 데이터가 없습니다.'
                    : '단일 이벤트를 선택하면 상세 뷰어십 데이터가 표시됩니다.'}
                </div>
              )}
            </TabsContent>

            {/* Social 탭 (추후 설계) */}
            <TabsContent value="social">
              <div className="py-16 text-center text-gray-500 text-sm bg-brand-surface border border-brand-border rounded-xl">
                소셜 분석 기능은 준비 중입니다.
              </div>
            </TabsContent>

            {/* Co-streaming 탭 (추후 설계) */}
            <TabsContent value="costreaming">
              <div className="py-16 text-center text-gray-500 text-sm bg-brand-surface border border-brand-border rounded-xl">
                Co-streaming 분석 기능은 준비 중입니다.
              </div>
            </TabsContent>

            {/* Data Upload 탭 */}
            <TabsContent value="upload">
              <div className="py-16 text-center bg-brand-surface border border-brand-border rounded-xl space-y-4">
                <p className="text-gray-400 text-sm">엑셀 파일을 업로드하여 데이터를 갱신합니다.</p>
                <Link
                  href="/upload"
                  className="inline-block px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 transition-all"
                >
                  업로드 페이지로 이동 →
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        </section>

      </div>
    </main>
  )
}
