'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  getViewershipTotal,
  getViewershipDataType,
  getContentAggregated,
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
  getEventMasterById,
  getDisplayName,
} from '@/lib/config/event-master'
import { KpiCard } from '@/components/kpi/KpiCard'
import { TournamentFilter } from '@/components/dashboard/TournamentFilter'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const ContentsTrendChart = dynamic(
  () => import('@/components/charts/ContentsTrendChart').then(m => m.ContentsTrendChart),
  { ssr: false },
)
const ContentCalendarChart = dynamic(
  () => import('@/components/charts/ContentCalendarChart').then(m => m.ContentCalendarChart),
  { ssr: false },
)

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-0.5 h-3.5 rounded-full bg-brand-accent shrink-0" />
      <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{children}</h2>
    </div>
  )
}

export default function DashboardPage() {
  const { data, loading, fetchError, refetch } = useDashboardData()
  const masterEntries = useInitEventMaster()
  const { lang, t } = useLang()

  const [officialOnly, setOfficialOnly] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const years = getAllYears()
    if (!years.length) return []
    const globals = getGlobalEventsByYear(years[0])
    return globals.length > 0 ? [globals[globals.length - 1].event_id] : []
  })
  const trendPeriod = 'weekly' as const
  const [trendMetric, setTrendMetric] = useState<'impressions' | 'content_count' | 'engagements' | 'video_views'>('content_count')
  const [calendarRegion, setCalendarRegion] = useState<string>('')

  function updateSelectedIds(ids: string[]) {
    setSelectedIds(ids)
  }

  const masterBootstrapped = useRef(false)
  useEffect(() => {
    if (!masterBootstrapped.current) {
      masterBootstrapped.current = true
      return
    }
    const years = getAllYears()
    if (!years.length) return
    const globals = getGlobalEventsByYear(years[0])
    if (globals.length > 0) setSelectedIds([globals[globals.length - 1].event_id])
  }, [masterEntries]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!data?.events.length || !selectedIds.length) return
    const validNames = new Set(data.events.map(e => e.name))
    const hasMatch = selectedIds.some(id => validNames.has(id))
    if (!hasMatch) {
      const years = getAllYears()
      const globals = getGlobalEventsByYear(years[0])
      const lastValid = [...globals].reverse().find(e => validNames.has(e.event_id))
      updateSelectedIds(lastValid ? [lastValid.event_id] : [data.events[0].name])
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const selectedYear = useMemo(() => {
    if (!selectedIds.length) return getAllYears()[0]
    return getEventMasterById(selectedIds[0])?.year ?? getAllYears()[0]
  }, [selectedIds])

  const regionOptions = useMemo(() =>
    data ? Array.from(new Set(data.social.map(s => s.region).filter(Boolean))).sort() as string[] : [],
    [data],
  )

  const calendarData = useMemo(
    () => data ? getContentCalendar(data, selectedYear, masterEntries, calendarRegion || undefined) : { weeks: [], events: [] },
    [data, selectedYear, masterEntries, calendarRegion],
  )

  if (loading && !data) return <div className="min-h-screen bg-brand-bg" />

  const isSingleEvent  = selectedIds.length === 1
  const singleEventId  = isSingleEvent ? selectedIds[0] : null
  const toUUID         = (eid: string) => data?.events.find(e => e.name === eid)?.id
  const singleUUID     = singleEventId ? (toUUID(singleEventId) ?? null) : null

  const total          = singleUUID ? getViewershipTotal(data!, singleUUID, officialOnly) : null
  const viewershipType = singleUUID ? getViewershipDataType(data!, singleUUID) : 'none'
  const isTypeBData    = viewershipType === 'B'

  const pccv           = total?.peak_ccv ?? 0
  const accv           = total?.acv ?? 0
  const stabilityRatio = pccv > 0 ? Math.round((accv / pccv) * 100) : null

  const content = data
    ? getContentAggregated(data, selectedUUIDs)
    : { impressions: 0, content_count: 0, video_views: 0, engagements: 0 }

  const uploadedDate = data
    ? new Date(data.uploadedAt).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')
    : ''

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-white">{t('dashTitle')}</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              {singleEventId
                ? getDisplayName(singleEventId)
                : `${selectedIds.length}${t('eventsSelected')}`}
              {data && (
                <span className="ml-2 text-gray-700">
                  · {t('uploaded')} {uploadedDate}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 필터 */}
        <TournamentFilter selectedIds={selectedIds} onChange={updateSelectedIds} />

        {/* 에러 배너 */}
        {fetchError && !data?.events.length && (
          <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-xs text-amber-400">{t('connError')}</p>
            <button
              onClick={refetch}
              className="shrink-0 px-3 py-1 rounded-lg border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/10 transition-colors"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {/* 데이터 없음 */}
        {!fetchError && !data?.events.length && (
          <div className="bg-brand-surface border border-brand-border rounded-xl px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-300">{t('noDataTitle')}</p>
              <p className="text-xs text-gray-600 mt-0.5">{t('noDataDesc')}</p>
            </div>
            <Link
              href="/data-upload"
              className="shrink-0 px-3 py-1.5 rounded-lg bg-brand-accent text-white text-xs font-medium hover:bg-brand-dim transition-colors"
            >
              {t('uploadDataBtn')}
            </Link>
          </div>
        )}

        {/* ── Viewership ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <SectionHeader>Viewership</SectionHeader>
              {!isSingleEvent && (
                <span className="text-[10px] text-gray-700 bg-brand-muted border border-brand-border px-2 py-0.5 rounded-full">
                  {t('selectSingleHint')}
                </span>
              )}
            </div>
            <button
              onClick={() => setOfficialOnly(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors',
                officialOnly
                  ? 'bg-brand-accent/15 border-brand-accent/40 text-blue-300'
                  : 'bg-brand-surface border-brand-border text-gray-600 hover:text-gray-300'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full transition-colors', officialOnly ? 'bg-brand-accent' : 'bg-gray-700')} />
              {t('officialOnly')}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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

        {/* ── Contents ── */}
        <section className="space-y-3">
          <SectionHeader>Contents</SectionHeader>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Number of Contents" value={content.content_count} unit={lang === 'ko' ? '건' : ''} />
            <KpiCard label="Impression"          value={content.impressions}   unit={lang === 'ko' ? '회' : ''} />
            <KpiCard label="Views"               value={content.video_views}   unit={lang === 'ko' ? '회' : ''} />
            <KpiCard label="Engagement"          value={content.engagements}   unit={lang === 'ko' ? '회' : ''} />
          </div>

          {hasDateData && (
            <div className="bg-brand-surface border border-brand-border rounded-xl p-4 space-y-3 mt-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-gray-400">{t('trendTitle')}</p>
                <select
                  value={trendMetric}
                  onChange={e => setTrendMetric(e.target.value as typeof trendMetric)}
                  className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-brand-accent/60"
                >
                  <option value="content_count">Number of Contents</option>
                  <option value="impressions">Impression</option>
                  <option value="video_views">Views</option>
                  <option value="engagements">Engagement</option>
                </select>
              </div>
              <ContentsTrendChart data={trendData} metric={trendMetric} period={trendPeriod} />
            </div>
          )}
        </section>

        {/* ── Contents Calendar ── */}
        {data && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <SectionHeader>Contents Calendar</SectionHeader>
                <span className="text-[10px] text-gray-700 bg-brand-muted border border-brand-border px-2 py-0.5 rounded-full">
                  {selectedYear}
                </span>
              </div>
              <select
                value={calendarRegion}
                onChange={e => setCalendarRegion(e.target.value)}
                className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-brand-accent/60"
              >
                <option value="">{lang === 'ko' ? '전체 언어' : 'All Languages'}</option>
                {regionOptions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
              <ContentCalendarChart data={calendarData} year={selectedYear} lang={lang} />
            </div>
          </section>
        )}

      </div>
    </main>
  )
}
