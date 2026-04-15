'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadData, getViewershipTotal, getViewershipByPlatform, getSocialByPlatform, getKpiTargets } from '@/lib/store'
import type { DashboardData } from '@/lib/store'
import { KpiCard } from '@/components/kpi/KpiCard'
import { TournamentFilter } from '@/components/dashboard/TournamentFilter'
import { EventCalendar } from '@/components/EventCalendar'
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
  const [data, setData] = useState<DashboardData | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = loadData()
    setData(stored)
    if (stored?.events?.length) {
      setSelectedId(stored.events[0].id)
    }
    setMounted(true)
  }, [])

  // 로딩 전
  if (!mounted) return <div className="min-h-screen bg-brand-bg" />

  // 데이터 없음
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

  const selectedEvent = data.events.find(e => e.id === selectedId) ?? data.events[0]
  const effectiveId   = selectedEvent.id

  // KPI 데이터 추출
  const total          = getViewershipTotal(data, effectiveId)
  const byPlatform     = getViewershipByPlatform(data, effectiveId)
  const social         = getSocialByPlatform(data, effectiveId)
  const targets        = getKpiTargets(data, effectiveId)

  const peakCcv        = total?.peak_ccv       ?? 0
  const uniqueViewers  = total?.unique_viewers  ?? 0
  const hoursWatched   = total?.hours_watched   ?? 0
  const totalImpr      = social.reduce((s, p) => s + p.impressions, 0)
  const totalEngag     = social.reduce((s, p) => s + p.engagements, 0)

  const getTarget = (metric: string) =>
    targets.find(t => t.metric === metric)?.target_value

  // 플랫폼별 CCV 차트 데이터
  const ccvChartData = byPlatform.map(v => ({
    platform: v.platform,
    peak_ccv: v.peak_ccv ?? 0,
  }))

  // 소셜 차트 데이터
  const socialChartData = social.map(s => ({
    platform:    s.platform,
    impressions: s.impressions,
    engagements: s.engagements,
    video_views: s.video_views,
  }))

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* 헤더 + 대회 필터 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">PUBG Esports 대시보드</h1>
            <p className="text-sm text-gray-400 mt-1">
              {selectedEvent.name}
              {selectedEvent.venue ? ` · ${selectedEvent.venue}` : ''}
              <span className="ml-2 text-xs text-gray-500">
                업로드: {new Date(data.uploadedAt).toLocaleDateString('ko-KR')}
              </span>
            </p>
          </div>
          <TournamentFilter
            events={data.events}
            selectedId={effectiveId}
            onChange={setSelectedId}
          />
        </div>

        {/* KPI 카드 5종 */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">핵심 KPI</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard
              label="Peak CCV"
              value={peakCcv}
              unit="명"
              target={getTarget('peak_ccv')}
            />
            <KpiCard
              label="Unique Viewers"
              value={uniqueViewers}
              unit="명"
              target={getTarget('unique_viewers')}
            />
            <KpiCard
              label="Total Hours Watched"
              value={hoursWatched}
              unit="시간"
              target={getTarget('hours_watched')}
            />
            <KpiCard
              label="콘텐츠 노출"
              value={totalImpr}
              unit="회"
              target={getTarget('impressions')}
            />
            <KpiCard
              label="총 반응 (Engagements)"
              value={totalEngag}
              unit="회"
              target={getTarget('engagements')}
            />
          </div>
        </section>

        {/* 플랫폼별 CCV */}
        {ccvChartData.length > 0 && (
          <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-300">플랫폼별 Peak CCV</h2>
              <p className="text-xs text-gray-500 mt-0.5">{selectedEvent.name}</p>
            </div>
            <PlatformCcvChart data={ccvChartData} />
          </section>
        )}

        {/* 소셜 채널별 성과 */}
        {socialChartData.length > 0 && (
          <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-300">소셜 채널별 성과</h2>
              <p className="text-xs text-gray-500 mt-0.5">플랫폼별 노출·반응·영상뷰</p>
            </div>
            <SocialPlatformChart data={socialChartData} />
          </section>
        )}

        {ccvChartData.length === 0 && socialChartData.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            선택한 대회의 KPI 데이터가 없습니다.
          </div>
        )}

        {/* 이벤트 캘린더 */}
        <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">이벤트 캘린더</h2>
          <EventCalendar events={data.events} />
        </section>

      </div>
    </main>
  )
}
