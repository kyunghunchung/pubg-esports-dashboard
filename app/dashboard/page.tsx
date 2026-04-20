'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  getViewershipTotal,
  getViewershipByPlatform,
  getViewershipDataType,
  getKpiTargets,
  getContentAggregated,
  getSocialAggregatedByPlatform,
} from '@/lib/store'
import { useDashboardData } from '@/lib/hooks/useDashboardData'
import {
  getAllYears,
  getGlobalEventsByYear,
  getDisplayName,
} from '@/lib/config/event-master'
import { KpiCard } from '@/components/kpi/KpiCard'
import { TournamentFilter } from '@/components/dashboard/TournamentFilter'
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
  // selectedIds = EVENT_MASTER event_id 배열 (예: ['PNC_2025'])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // 기본 선택: 최신 연도 첫 번째 글로벌 이벤트 (EVENT_MASTER 기준)
  useEffect(() => {
    const years = getAllYears()
    if (!years.length) return
    const latestYear = years[0]
    const globals = getGlobalEventsByYear(latestYear)
    const defaultIds = globals.length > 0 ? [globals[0].event_id] : []

    // 현재 선택이 EVENT_MASTER 에 없는 경우에만 초기화
    const allMasterIds = globals.map(e => e.event_id)
    const stillValid = selectedIds.length > 0 && selectedIds.every(id => allMasterIds.includes(id))
    if (!stillValid) setSelectedIds(defaultIds)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) return <div className="min-h-screen bg-brand-bg" />

  // 데이터 없어도 필터는 EVENT_MASTER 기준으로 렌더링
  const isSingleEvent = selectedIds.length === 1
  const singleEventId = isSingleEvent ? selectedIds[0] : null

  // event_id → Supabase UUID 매핑 (KPI 쿼리용)
  const toUUID = (eid: string) => data?.events.find(e => e.name === eid)?.id
  const singleUUID   = singleEventId ? (toUUID(singleEventId) ?? null) : null
  const selectedUUIDs = selectedIds.map(toUUID).filter((id): id is string => Boolean(id))

  // ── Viewership KPI (단일 이벤트 + Supabase UUID 있을 때만) ──
  const total          = singleUUID ? getViewershipTotal(data!, singleUUID) : null
  const byPlatform     = singleUUID ? getViewershipByPlatform(data!, singleUUID) : []
  const viewershipType = singleUUID ? getViewershipDataType(data!, singleUUID) : 'none'
  const isTypeBData    = viewershipType === 'B'
  const targets        = singleUUID ? getKpiTargets(data!, singleUUID) : []

  const getTarget = (metric: string) =>
    targets.find(t => t.metric === metric)?.target_value

  const pccv = total?.peak_ccv ?? 0
  const accv = total?.acv ?? 0
  const stabilityRatio = pccv > 0 ? Math.round((accv / pccv) * 100) : null

  // ── Contents KPI (항상 집계, UUID 기준) ──
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
          onChange={setSelectedIds}
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
              target={getTarget('peak_ccv')}
              disabled={!isSingleEvent}
              caption={isTypeBData ? '※ 플랫폼별 PCCV 합산 수치입니다' : undefined}
            />
            <KpiCard
              label="ACCV"
              sublabel="Average Concurrent Viewers"
              value={accv}
              unit="명"
              target={getTarget('acv')}
              disabled={!isSingleEvent}
            />
            <KpiCard
              label="UV"
              sublabel="Unique Viewers"
              value={total?.unique_viewers ?? 0}
              unit="명"
              target={getTarget('unique_viewers')}
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
            <KpiCard label="Impression"        value={content.impressions}   unit="회" />
            <KpiCard label="Number of Contents" value={content.content_count} unit="건" />
          </div>
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
