'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/context/lang'
import type { Event, ReportHistory, ReportType, ViewershipKpi, SocialKpi } from '@/types'

interface Props {
  events: Event[]
  history: ReportHistory[]
  viewership?: ViewershipKpi[]
  social?: SocialKpi[]
}

export function ReportsClient({ events, history, viewership = [], social = [] }: Props) {
  const { lang, t } = useLang()
  const [reportType, setReportType] = useState<ReportType>('event_result')
  const [selectedEventId, setSelectedEventId] = useState<string>(
    events.find((e) => e.status === 'completed')?.id ?? ''
  )
  const [generating, setGenerating] = useState(false)
  const [filterType, setFilterType] = useState<ReportType | 'all'>('all')

  const REPORT_TYPES: { value: ReportType; label: string; desc: string }[] = [
    { value: 'event_result', label: t('reportTypeEvent'),  desc: t('reportTypeEventDesc') },
    { value: 'weekly',       label: t('reportTypeWeekly'), desc: t('reportTypeWeeklyDesc') },
    { value: 'annual',       label: t('reportTypeAnnual'), desc: t('reportTypeAnnualDesc') },
  ]

  const TYPE_LABEL: Record<ReportType, string> = {
    event_result: t('reportTypeEventShort'),
    weekly:       t('reportTypeWeeklyShort'),
    annual:       t('reportTypeAnnualShort'),
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  async function handleExcelExport() {
    if (!selectedEvent) return
    setGenerating(true)
    try {
      const eventViewership = viewership.filter((v) => v.event_id === selectedEventId)
      const eventSocial     = social.filter((s) => s.event_id === selectedEventId)

      const { generateEventExcel } = await import('@/lib/export/generate-excel')
      const buf = generateEventExcel(selectedEvent, eventViewership, eventSocial)
      const blob = new Blob([buf.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedEvent.name}_KPI.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerating(false)
    }
  }

  const filteredHistory = filterType === 'all' ? history : history.filter((r) => r.type === filterType)

  return (
    <div className="space-y-10">
      {/* 리포트 생성 */}
      <section className="bg-brand-surface border border-brand-border rounded-xl p-6 space-y-6">
        <h2 className="text-base font-semibold text-white">{t('reportGenerateTitle')}</h2>

        <div>
          <p className="text-sm text-gray-400 mb-3">{t('reportTypeLabel')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {REPORT_TYPES.map((rt) => (
              <button
                key={rt.value}
                onClick={() => setReportType(rt.value)}
                className={cn(
                  'p-4 rounded-lg border text-left transition-all',
                  reportType === rt.value
                    ? 'border-brand-accent bg-brand-accent/10 text-white'
                    : 'border-brand-border text-gray-400 hover:border-gray-500 hover:text-white'
                )}
              >
                <p className="font-medium text-sm">{rt.label}</p>
                <p className="text-xs mt-1 text-gray-500">{rt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {reportType === 'event_result' && (
          <div>
            <p className="text-sm text-gray-400 mb-3">{t('reportSelectEvent')}</p>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-brand-bg border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white w-full sm:w-80 focus:outline-none focus:border-brand-accent"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name} ({ev.year})</option>
              ))}
            </select>
          </div>
        )}

        {selectedEvent && reportType === 'event_result' && (
          <div className="bg-brand-bg border border-brand-border rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">{t('reportPreview')}</p>
            <p className="text-sm font-semibold text-white">{selectedEvent.name} {t('reportPreviewLabel')}</p>
            <p className="text-xs text-gray-500 mt-1">
              {selectedEvent.start_date} ~ {selectedEvent.end_date} | {selectedEvent.venue ?? 'TBD'}
            </p>
            <p className="text-xs text-gray-500 mt-1">{t('reportPreviewIncludes')}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleExcelExport}
            disabled={generating || !selectedEventId}
            className="px-5 py-2.5 rounded-lg bg-kpi-success/20 border border-kpi-success/40 text-kpi-success text-sm font-medium hover:bg-kpi-success/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? t('reportGenerating') : 'Excel Export (.xlsx)'}
          </button>
          <button
            disabled
            className="px-5 py-2.5 rounded-lg bg-brand-accent/10 border border-brand-accent/30 text-brand-accent text-sm font-medium opacity-40 cursor-not-allowed"
          >
            {t('pdfComingSoon')}
          </button>
        </div>
      </section>

      {/* 히스토리 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">{t('reportHistoryTitle')}</h2>
          <div className="flex gap-2">
            {(['all', 'event_result', 'weekly', 'annual'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilterType(v as typeof filterType)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-all',
                  filterType === v
                    ? 'bg-brand-accent text-white'
                    : 'bg-brand-surface border border-brand-border text-gray-400 hover:text-white'
                )}
              >
                {v === 'all' ? t('all') : TYPE_LABEL[v as ReportType]}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-12">{t('reportNoHistory')}</p>
        ) : (
          <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">{t('colTitle')}</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">{t('colType')}</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">{t('colCreatedBy')}</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">{t('colDate')}</th>
                  <th className="px-5 py-3 text-right text-gray-400 font-medium">{t('colDownload')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((r) => (
                  <tr key={r.id} className="border-b border-brand-border last:border-0 hover:bg-white/5">
                    <td className="px-5 py-3 text-white font-medium">{r.title}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
                        {TYPE_LABEL[r.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{r.created_by ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-400">
                      {new Date(r.created_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.file_url ? (
                        <a href={r.file_url} className="text-brand-accent hover:underline text-xs">{t('downloadLink')}</a>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
