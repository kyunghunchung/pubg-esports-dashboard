'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  getViewershipTotal,
  getViewershipByPlatform,
  getKpiTargets,
  getContentAggregated,
  getSocialAggregatedByPlatform,
} from '@/lib/store'
import { useDashboardData } from '@/lib/hooks/useDashboardData'
import { isGlobalEvent } from '@/lib/config/constants'
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
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!data?.events?.length) return

    const globals = data.events.filter(e => isGlobalEvent(e.type))
    const display = globals.length > 0 ? globals : data.events

    const years = Array.from(new Set(display.map(e => e.year))).sort((a, b) => b - a)
    const latestYear = years[0]
    const latestIds = display
      .filter(e => e.year === latestYear)
      .map(e => e.id)

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

  const isSingleEvent = selectedIds.length === 1
  const singleEvent   = isSingleEvent ? data.events.find(e => e.id === selectedIds[0]) : null

  // ── Viewership KPI (단일 이벤트만) ──
  const total      = isSingleEvent ? getViewershipTotal(data, selectedIds[0]) : null
  const byPlatform = isSingleEvent ? getViewershipByPlatform(data, selectedIds[0]) : []
  const targets    = isSingleEvent ? getKpiTargets(data, selectedIds[0]) : []

  const getTarget = (metric: string) =>
    targets.find(t => t.metric === metric)?.target_value

  // ── Contents KPI (항상 집계) ──
  const content = getContentAggregated(data, selectedIds)

  // ── 플랫폼별 CCV 차트 (단일 이벤트) ──
  const ccvChartData = byPlatform.map(v => ({
    platform: v.platform,
    peak_ccv: v.peak_ccv ?? 0,
  }))

  // ── 소셜 차트 (항상 집계) ──
  const socialChartData = getSocialAggregatedByPlatform(data, selectedIds)

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold">PUBG Esports Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            {singleEvent
              ? `${singleEvent.name}${singleEvent.venue ? ` · ${singleEvent.venue}` : ''}`
              : `${selectedIds.length}개 이벤트 선택됨`}
            <span className="ml-2 text-xs text-gray-500">
              업로드: {new Date(data.uploadedAt).toLocaleDateString('ko-KR')}
            </span>
          </p>
        </div>

        {/* 필터 */}
        <TournamentFilter
          events={data.events}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="Peak CCV"
              value={total?.peak_ccv ?? 0}
              unit="명"
              target={getTarget('peak_ccv')}
              disabled={!isSingleEvent}
            />
            <KpiCard
              label="Unique Viewers"
              value={total?.unique_viewers ?? 0}
              unit="명"
              target={getTarget('unique_viewers')}
              disabled={!isSingleEvent}
            />
            <KpiCard
              label="Hours Watched"
              value={total?.hours_watched ?? 0}
              unit="시간"
              target={getTarget('hours_watched')}
              disabled={!isSingleEvent}
            />
          </div>
        </section>

        {/* ── 섹션 B: Contents KPI ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Contents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiCard
              label="Impression"
              value={content.impressions}
              unit="회"
            />
            <KpiCard
              label="Number of Contents"
              value={content.content_count}
              unit="건"
            />
          </div>
        </section>

        {/* ── 차트 1: 플랫폼별 CCV (단일 이벤트만) ── */}
        {isSingleEvent ? (
          ccvChartData.length > 0 ? (
            <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-300">플랫폼별 Peak CCV</h2>
                <p className="text-xs text-gray-500 mt-0.5">{singleEvent?.name}</p>
              </div>
              <PlatformCcvChart data={ccvChartData} />
            </section>
          ) : null
        ) : (
          <section className="bg-brand-surface border border-brand-border rounded-xl p-6 flex items-center justify-center h-32">
            <p className="text-sm text-gray-500">단일 이벤트를 선택하면 플랫폼별 CCV 차트가 표시됩니다.</p>
          </section>
        )}

        {/* ── 차트 2: 소셜 채널별 성과 (항상 집계) ── */}
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
