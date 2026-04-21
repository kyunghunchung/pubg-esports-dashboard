'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useDashboardData } from '@/lib/hooks/useDashboardData'
import { useInitEventMaster } from '@/lib/hooks/useInitEventMaster'
import { useLang } from '@/lib/context/lang'
import {
  getAllYears,
  getEventsByYear,
  getDisplayName,
} from '@/lib/config/event-master'
import { KpiCard } from '@/components/kpi/KpiCard'
import { getSocialTrend, hasSocialDateData } from '@/lib/store'
import { formatNumber, cn } from '@/lib/utils'
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
  placeholder = '',
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
  const { data, loading, fetchError, refetch } = useDashboardData()
  const masterEntries = useInitEventMaster()
  const { lang, t } = useLang()

  const [filterYear,     setFilterYear]     = useState('')
  const [filterEvent,    setFilterEvent]    = useState('')
  const [filterRegion,   setFilterRegion]   = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterType1,    setFilterType1]    = useState('')
  const [filterType2,    setFilterType2]    = useState('')

  const [trendPeriod, setTrendPeriod] = useState<'monthly' | 'weekly'>('monthly')
  const [trendMetric, setTrendMetric] = useState<'impressions' | 'content_count' | 'engagements' | 'video_views'>('content_count')

  const yearOptions = useMemo(() => getAllYears(), [masterEntries])

  const eventOptions = useMemo(() =>
    filterYear ? getEventsByYear(Number(filterYear)) : [],
    [filterYear, masterEntries]
  )

  const toUUID = (eid: string) => data?.events.find(e => e.name === eid)?.id

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

  const platformOptions = useMemo(() =>
    data ? Array.from(new Set(data.social.map(s => s.platform))).sort() : [],
    [data])

  const regionOptions = useMemo(() =>
    data ? Array.from(new Set(data.social.map(s => s.region).filter(Boolean))) as string[] : [],
    [data])

  const type1Options = useMemo(() =>
    data ? Array.from(new Set(data.social.map(s => s.content_type_1).filter(Boolean))) as string[] : [],
    [data])

  const type2Options = useMemo(() =>
    data ? Array.from(new Set(data.social.map(s => s.content_type_2).filter(Boolean))) as string[] : [],
    [data])

  const hasDateData = useMemo(() =>
    data ? hasSocialDateData(data, filteredUUIDs) : false,
    [data, filteredUUIDs])

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
          <p className="text-sm text-gray-400 mt-1">{t('contentsSubtitle')}</p>
        </div>

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

        {/* 데이터 없음 */}
        {!fetchError && !data?.events.length && (
          <div className="bg-brand-surface border border-brand-border rounded-xl p-6 flex items-center justify-between">
            <p className="text-sm text-gray-400">{t('noDataUploaded')}</p>
            <Link href="/data-upload" className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80">
              {t('uploadDataBtn')}
            </Link>
          </div>
        )}

        {/* 6개 필터 */}
        <section className="bg-brand-surface border border-brand-border rounded-xl p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <FilterSelect
              label={t('filterYear')}
              value={filterYear}
              onChange={v => { setFilterYear(v); setFilterEvent('') }}
              options={yearOptions.map(y => ({ value: String(y), label: String(y) }))}
              placeholder={t('all')}
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">{t('filterTournament')}</label>
              <select
                value={filterEvent}
                onChange={e => setFilterEvent(e.target.value)}
                disabled={eventOptions.length === 0}
                className={cn(
                  'bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors',
                  eventOptions.length === 0 && 'opacity-40 cursor-not-allowed',
                )}
              >
                <option value="">{t('all')}</option>
                {eventOptions.map(e => (
                  <option key={e.event_id} value={e.event_id}>{e.display_name}</option>
                ))}
              </select>
            </div>
            <FilterSelect
              label={t('filterRegion')}
              value={filterRegion}
              onChange={setFilterRegion}
              options={regionOptions}
              placeholder={regionOptions.length === 0 ? t('noDataPlaceholder') : t('all')}
            />
            <FilterSelect
              label={t('filterPlatform')}
              value={filterPlatform}
              onChange={setFilterPlatform}
              options={platformOptions}
              placeholder={t('all')}
            />
            <FilterSelect
              label={t('filterType1')}
              value={filterType1}
              onChange={setFilterType1}
              options={type1Options}
              placeholder={type1Options.length === 0 ? t('noDataPlaceholder') : t('all')}
            />
            <FilterSelect
              label={t('filterType2')}
              value={filterType2}
              onChange={setFilterType2}
              options={type2Options}
              placeholder={type2Options.length === 0 ? t('noDataPlaceholder') : t('all')}
            />
          </div>

          {filterEvent && (
            <div className="mt-3 pt-3 border-t border-brand-border">
              <p className="text-xs text-gray-400">
                {t('selectedEvent')} <span className="text-white font-medium">{getDisplayName(filterEvent)}</span>
              </p>
            </div>
          )}
        </section>

        {/* KPI 카드 */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{t('kpiSectionTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Number of Contents" value={kpi.content_count} unit={lang === 'ko' ? '건' : ''} />
            <KpiCard label="Views"              value={kpi.video_views}   unit={lang === 'ko' ? '회' : ''} />
            <KpiCard label="Engagement"         value={kpi.engagements}   unit={lang === 'ko' ? '회' : ''} />
          </div>
        </section>

        {/* 기간별 트렌드 */}
        {hasDateData ? (
          <section className="bg-brand-surface border border-brand-border rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-300">{t('trendTitle')}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{t('trendDateHint')}</p>
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
                      {p === 'monthly' ? t('monthly') : t('weekly')}
                    </button>
                  ))}
                </div>
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
            </div>
            <ContentsTrendChart data={trendData} metric={trendMetric} period={trendPeriod} />
          </section>
        ) : (
          data && filteredUUIDs.length > 0 && (
            <section className="bg-brand-surface border border-brand-border rounded-xl p-5 flex items-center gap-3">
              <span className="text-gray-500 text-sm">
                {t('trendDatePrompt').split('Date').map((part, i) =>
                  i === 0 ? part : <><code key={i} className="bg-brand-bg px-1.5 py-0.5 rounded text-xs text-gray-300">Date</code>{part}</>
                )}
              </span>
            </section>
          )
        )}

        {/* 플랫폼별 상세 테이블 */}
        {filteredSocial.length > 0 ? (
          <section className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-brand-border">
              <h2 className="text-sm font-semibold text-gray-300">{t('platformDetails')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {lang === 'ko'
                  ? `총 ${filteredSocial.length}${t('dataRows')}`
                  : `${filteredSocial.length}${t('dataRows')}`}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="px-5 py-3 text-left text-gray-400 font-medium">{t('colEvent')}</th>
                    <th className="px-5 py-3 text-left text-gray-400 font-medium">{t('colPlatform')}</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">{t('colContents')}</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">{t('colImpression')}</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">{t('colViews')}</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">{t('colEngagement')}</th>
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
            {t('noMatchingData')}
          </div>
        )}

      </div>
    </main>
  )
}
