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
import { getCostreamingAggregated } from '@/lib/store'
import { formatNumber, cn } from '@/lib/utils'

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

function StatCard({
  label, value, unit, caption, disabled,
}: {
  label: string; value?: number | null; unit?: string; caption?: string; disabled?: boolean
}) {
  return (
    <div className={cn('bg-brand-surface border border-brand-border rounded-xl p-5 space-y-2', disabled && 'opacity-50')}>
      <p className="text-sm text-gray-400 font-medium">{label}</p>
      <div>
        {disabled || value == null ? (
          <span className="text-3xl font-bold tabular-nums text-gray-500">—</span>
        ) : (
          <>
            <span className="text-3xl font-bold tabular-nums text-white">{formatNumber(value)}</span>
            {unit && <span className="ml-1 text-sm text-gray-400">{unit}</span>}
          </>
        )}
      </div>
      {caption && <p className="text-xs text-gray-600 leading-relaxed">{caption}</p>}
    </div>
  )
}

export default function CostreamingPage() {
  const { data, loading } = useDashboardData()
  const masterEntries = useInitEventMaster()
  const { lang, t } = useLang()

  const [filterYear,   setFilterYear]   = useState('')
  const [filterEvent,  setFilterEvent]  = useState('')
  const [filterRegion, setFilterRegion] = useState('')

  const yearOptions = useMemo(() => getAllYears().map(String), [masterEntries])

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

  const regionOptions = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.costreaming.map(b => b.region).filter(Boolean))) as string[]
  }, [data])

  const coKpi = useMemo(() => {
    if (!data) return null
    return getCostreamingAggregated(data, filteredUUIDs, filterRegion || undefined)
  }, [data, filteredUUIDs, filterRegion])

  const avgPeakView = coKpi && coKpi.streamer_count > 0
    ? Math.round(coKpi.peak_view_sum / coKpi.streamer_count)
    : null

  const roi = coKpi && coKpi.total_cost_usd > 0 && coKpi.peak_view_sum > 0
    ? coKpi.total_cost_usd / coKpi.peak_view_sum
    : null

  if (loading && !data) return <div className="min-h-screen bg-brand-bg" />

  const unit = lang === 'ko' ? '명' : ''

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold">Co-streaming</h1>
          <p className="text-sm text-gray-400 mt-1">{t('coSubtitle')}</p>
        </div>

        {/* 데이터 없음 */}
        {!data?.events.length && (
          <div className="bg-brand-surface border border-brand-border rounded-xl p-6 flex items-center justify-between">
            <p className="text-sm text-gray-400">{t('noDataUploaded')}</p>
            <Link href="/data-upload" className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80">
              {t('uploadDataBtn')}
            </Link>
          </div>
        )}

        {/* 필터 */}
        <section className="bg-brand-surface border border-brand-border rounded-xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FilterSelect
              label={t('filterYear')}
              value={filterYear}
              onChange={v => { setFilterYear(v); setFilterEvent('') }}
              options={yearOptions}
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
          </div>

          {filterEvent && (
            <div className="mt-3 pt-3 border-t border-brand-border">
              <p className="text-xs text-gray-400">
                {t('selectedEvent')} <span className="text-white font-medium">{getDisplayName(filterEvent)}</span>
              </p>
            </div>
          )}
        </section>

        {/* KPI 그룹 1 */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{t('coStreamerScale')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label={t('coStreamerCount')} value={coKpi?.streamer_count} unit={unit} />
          </div>
        </div>

        {/* KPI 그룹 2 */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{t('coViewerMetrics')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label={t('coPeakViewTotal')}
              value={coKpi?.peak_view_sum}
              unit={unit}
              caption={t('coPeakViewCaption')}
            />
            <StatCard
              label="ACCV"
              value={coKpi?.acv && coKpi.acv > 0 ? Math.round(coKpi.acv) : null}
              unit={unit}
              caption="Average Concurrent Viewers"
            />
            <StatCard
              label={t('coAvgPeakView')}
              value={avgPeakView}
              unit={unit}
              caption={t('coAvgPeakViewCaption')}
            />
          </div>
        </div>

        {/* KPI 그룹 3 */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{t('coRoi')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label={t('coRoiLabel')}
              value={roi != null ? Math.round(roi * 100) / 100 : null}
              unit="USD/명"
              caption={t('coRoiCaption')}
              disabled={roi == null}
            />
          </div>
        </div>

        {/* 상세 테이블 */}
        {data && data.costreaming.filter(b => filteredUUIDs.includes(b.event_id)).length > 0 && (
          <section className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-brand-border">
              <h2 className="text-sm font-semibold text-gray-300">{t('coDetailsTitle')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="px-5 py-3 text-left text-gray-400 font-medium">{t('colEvent')}</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">{t('colStreamers')}</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">{t('colPeakViewTotal')}</th>
                    <th className="px-5 py-3 text-right text-gray-400 font-medium">{t('colRegion')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.costreaming
                    .filter(b => {
                      if (!filteredUUIDs.includes(b.event_id)) return false
                      if (filterRegion && b.region !== filterRegion) return false
                      return true
                    })
                    .map((row, i) => {
                      const eventName = data.events.find(e => e.id === row.event_id)?.name
                      return (
                        <tr key={i} className="border-b border-brand-border last:border-0 hover:bg-white/5">
                          <td className="px-5 py-3 text-white font-medium">
                            {eventName ? getDisplayName(eventName) : '—'}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-300 tabular-nums">
                            {row.co_streamer_count != null ? formatNumber(row.co_streamer_count) : '—'}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-300 tabular-nums">
                            {row.co_streamer_viewers != null ? formatNumber(row.co_streamer_viewers) : '—'}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-300">{row.region ?? '—'}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </main>
  )
}
