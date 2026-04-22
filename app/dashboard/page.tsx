'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  getViewershipTotal,
  getViewershipDataType,
  getContentAggregated,
  getSocialAggregatedByPlatform,
  getSocialTrend,
  hasSocialDateData,
  getContentCalendar,
} from '@/lib/store'
import { useDashboardData } from '@/lib/hooks/useDashboardData'
import { useInitEventMaster } from '@/lib/hooks/useInitEventMaster'
import { useLang } from '@/lib/context/lang'
import {
  getAllYears,
  getGlobalEventsByYear,
  getDisplayName,
} from '@/lib/config/event-master'
import { KpiCard } from '@/components/kpi/KpiCard'
import { TournamentFilter } from '@/components/dashboard/TournamentFilter'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const SocialPlatformChart = dynamic(
  () => import('@/components/charts/SocialPlatformChart').then(m => m.SocialPlatformChart),
  { ssr: false },
)
const ContentsTrendChart = dynamic(
  () => import('@/components/charts/ContentsTrendChart').then(m => m.ContentsTrendChart),
  { ssr: false },
)
const ContentCalendarChart = dynamic(
  () => import('@/components/charts/ContentCalendarChart').then(m => m.ContentCalendarChart),
  { ssr: false },
)

export default function DashboardPage() {
  const { data, loading, fetchError, refetch } = useDashboardData()
  const masterEntries = useInitEventMaster()
  const { lang, t } = useLang()

  const [officialOnly, setOfficialOnly] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('dashboard_selected_ids')
      if (saved) return JSON.parse(saved) as string[]
    } catch { /* ignore */ }
    return []
  })
  const trendPeriod = 'weekly' as const
  const [trendMetric, setTrendMetric] = useState<'impressions' | 'content_count' | 'engagements' | 'video_views'>('content_count')
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear())

  function updateSelectedIds(ids: string[]) {
    setSelectedIds(ids)
    try { localStorage.setItem('dashboard_selected_ids', JSON.stringify(ids)) } catch { /* ignore */ }
  }

  useEffect(() => {
    const years = getAllYears()
    if (!years.length) return
    const allMasterIds = getAllYears().flatMap(y => getGlobalEventsByYear(y).map(e => e.event_id))
    const stillValid = selectedIds.length > 0 && selectedIds.every(id => allMasterIds.includes(id))
    if (!stillValid) {
      const latestYear = years[0]
      const globals = getGlobalEventsByYear(latestYear)
      updateSelectedIds(globals.length > 0 ? [globals[globals.length - 1].event_id] : [])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!data?.events.length || !selectedIds.length) return
    const validNames = new Set(data.events.map(e => e.name))
    const hasMatch = selectedIds.some(id => validNames.has(id))
    if (!hasMatch) {
      const years = getAllYears()
      const latestYear = years[0]
      const globals = getGlobalEventsByYear(latestYear)
      const lastValid = [...globals].reverse().find(e => validNames.has(e.event_id))
      updateSelectedIds(lastValid ? [lastValid.event_id] : [data.events[0].name])
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

  const calendarData = useMemo(
    () => data ? getContentCalendar(data, calendarYear, masterEntries) : { weeks: [], events: [] },
    [data, calendarYear, masterEntries],
  )

  if (loading && !data) return <div className="min-h-screen bg-brand-bg" />

  const isSingleEvent = selectedIds.length === 1
  const singleEventId = isSingleEvent ? selectedIds[0] : null

  const toUUID = (eid: string) => data?.events.find(e => e.name === eid)?.id
  const singleUUID = singleEventId ? (toUUID(singleEventId) ?? null) : null

  const total          = singleUUID ? getViewershipTotal(data!, singleUUID, officialOnly) : null
  const viewershipType = singleUUID ? getViewershipDataType(data!, singleUUID) : 'none'
  const isTypeBData    = viewershipType === 'B'

  const pccv           = total?.peak_ccv ?? 0
  const accv           = total?.acv ?? 0
  const stabilityRatio = pccv > 0 ? Math.round((accv / pccv) * 100) : null

  const content        = data ? getContentAggregated(data, selectedUUIDs) : { impressions: 0, content_count: 0, video_views: 0, engagements: 0 }
  const socialChartData = data ? getSocialAggregatedByPlatform(data, selectedUUIDs) : []

  const uploadedDate = data
    ? new Date(data.uploadedAt).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')
    : ''

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold">{t('dashTitle')}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {singleEventId
              ? getDisplayName(singleEventId)
              : `${selectedIds.length}${t('eventsSelected')}`}
            {data && (
              <span className="ml-2 text-xs text-gray-500">
                {t('uploaded')} {uploadedDate}
              </span>
            )}
          </p>
        </div>

        {/* 필터 */}
        <TournamentFilter
          selectedIds={selectedIds}
          onChange={updateSelectedIds}
        />

        {/* Supabase 연결 오류 */}
        {fetchError && !data?.events.length && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-yellow-300">{t('connError')}</p>
            <button
              onClick={refetch}
              className="shrink-0 px-3 py-1.5 rounded-lg border border-yellow-500/40 text-yellow-300 text-xs font-medium hover:bg-yellow-500/10 transition-all"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {/* 데이터 미업로드 안내 */}
        {!fetchError && !data?.events.length && (
          <div className="bg-brand-surface border border-brand-border rounded-xl p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">{t('noDataTitle')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('noDataDesc')}</p>
            </div>
            <Link
              href="/data-upload"
              className="shrink-0 px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 transition-all"
            >
              {t('uploadDataBtn')}
            </Link>
          </div>
        )}

        {/* ── 섹션 A: Viewership KPI ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Viewership
              </h2>
              {!isSingleEvent && (
                <span className="text-xs text-gray-600 bg-brand-surface border border-brand-border px-2 py-0.5 rounded-full">
                  {t('selectSingleHint')}
                </span>
              )}
            </div>
            {/* Official Only 토글 */}
            <button
              onClick={() => setOfficialOnly(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                officialOnly
                  ? 'bg-brand-accent/20 border-brand-accent/50 text-brand-accent'
                  : 'bg-brand-surface border-brand-border text-gray-400 hover:text-white'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', officialOnly ? 'bg-brand-accent' : 'bg-gray-600')} />
              {t('officialOnly')}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <KpiCard
              label="PCCV"
              sublabel="Peak Concurrent Viewers"
              value={pccv}
              unit={lang === 'ko' ? '명' : ''}
              disabled={!isSingleEvent}
              caption={isTypeBData ? t('typeBCaption') : undefined}
            />
            <KpiCard
              label="ACCV"
              sublabel="Average Concurrent Viewers"
              value={accv}
              unit={lang === 'ko' ? '명' : ''}
              disabled={!isSingleEvent}
            />
            <KpiCard
              label="UV"
              sublabel="Unique Viewers"
              value={total?.unique_viewers ?? 0}
              unit={lang === 'ko' ? '명' : ''}
              disabled={!isSingleEvent}
            />
            <KpiCard
              label={t('hoursWatched')}
              sublabel="Hours Watched"
              value={total?.hours_watched ?? 0}
              disabled={!isSingleEvent}
            />
            <KpiCard
              label="Stability Ratio"
              sublabel="ACCV ÷ PCCV"
              tooltip={t('stabilityTooltip')}
              value={stabilityRatio ?? 0}
              unit="%"
              disabled={!isSingleEvent}
              badge={
                stabilityRatio !== null
                  ? stabilityRatio >= 70 ? { text: t('badgeStable'), color: 'green' }
                  : stabilityRatio >= 50 ? { text: t('badgeNormal'), color: 'yellow' }
                  :                        { text: t('badgeHigh'),   color: 'red' }
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Number of Contents" value={content.content_count} unit={lang === 'ko' ? '건' : ''} />
            <KpiCard label="Impression"         value={content.impressions}   unit={lang === 'ko' ? '회' : ''} />
            <KpiCard label="Views"              value={content.video_views}   unit={lang === 'ko' ? '회' : ''} />
            <KpiCard label="Engagement"         value={content.engagements}   unit={lang === 'ko' ? '회' : ''} />
          </div>

          {/* 기간별 트렌드 (주간) */}
          {hasDateData ? (
            <div className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-4 mt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-300">{t('trendTitle')}</p>
                <select
                  value={trendMetric}
                  onChange={e => setTrendMetric(e.target.value as typeof trendMetric)}
                  className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-accent"
                >
                  <option value="content_count">Number of Contents</option>
                  <option value="impressions">Impression</option>
                  <option value="video_views">Views</option>
                  <option value="engagements">Engagement</option>
                </select>
              </div>
              <ContentsTrendChart data={trendData} metric={trendMetric} period={trendPeriod} />
            </div>
          ) : null}
        </section>

        {/* ── 소셜 채널별 성과 ── */}
        {socialChartData.length > 0 && (
          <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-300">{t('socialPerformance')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('socialDesc')}</p>
            </div>
            <SocialPlatformChart data={socialChartData} />
          </section>
        )}

        {/* ── 섹션 C: 연간 콘텐츠 캘린더 ── */}
        {data && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                {lang === 'ko' ? '콘텐츠 캘린더' : 'Contents Calendar'}
              </h2>
              <select
                value={calendarYear}
                onChange={e => setCalendarYear(Number(e.target.value))}
                className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-accent"
              >
                {getAllYears().map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
              <ContentCalendarChart data={calendarData} year={calendarYear} lang={lang} />
            </div>
          </section>
        )}

      </div>
    </main>
  )
}
