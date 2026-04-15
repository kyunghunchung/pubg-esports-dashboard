'use client'

import { useState } from 'react'
import { cn, formatNumber } from '@/lib/utils'
import type { Event, ReportHistory, ReportType, ViewershipKpi, SocialKpi } from '@/types'

interface Props {
  events: Event[]
  history: ReportHistory[]
}

const REPORT_TYPES: { value: ReportType; label: string; desc: string }[] = [
  { value: 'event_result', label: '이벤트 결과 보고서', desc: '전체 KPI + 목표 달성 현황' },
  { value: 'weekly',       label: '주간 실적 요약',     desc: '이번 주 활성 이벤트 KPI 스냅샷' },
  { value: 'annual',       label: '연간 실적 총결산',   desc: '연도별 전체 이벤트 비교' },
]

const TYPE_LABEL: Record<ReportType, string> = {
  event_result: '이벤트 결과',
  weekly: '주간 요약',
  annual: '연간 총결산',
}

export function ReportsClient({ events, history }: Props) {
  const [reportType, setReportType] = useState<ReportType>('event_result')
  const [selectedEventId, setSelectedEventId] = useState<string>(
    events.find((e) => e.status === 'completed')?.id ?? ''
  )
  const [generating, setGenerating] = useState(false)
  const [filterType, setFilterType] = useState<ReportType | 'all'>('all')

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  async function handleExcelExport() {
    if (!selectedEvent) return
    setGenerating(true)
    try {
      const res = await fetch(`/api/kpis?event_id=${selectedEventId}`)
      const data = await res.json()
      const viewership: ViewershipKpi[] = data.viewership.data ?? []
      const social: SocialKpi[] = data.social.data ?? []

      const { generateEventExcel } = await import('@/lib/export/generate-excel')
      const buf = generateEventExcel(selectedEvent, viewership, social)
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
      {/* 리포트 생성 패널 */}
      <section className="bg-brand-surface border border-brand-border rounded-xl p-6 space-y-6">
        <h2 className="text-base font-semibold text-white">리포트 생성</h2>

        {/* 유형 선택 */}
        <div>
          <p className="text-sm text-gray-400 mb-3">리포트 유형</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {REPORT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setReportType(t.value)}
                className={cn(
                  'p-4 rounded-lg border text-left transition-all',
                  reportType === t.value
                    ? 'border-brand-accent bg-brand-accent/10 text-white'
                    : 'border-brand-border text-gray-400 hover:border-gray-500 hover:text-white'
                )}
              >
                <p className="font-medium text-sm">{t.label}</p>
                <p className="text-xs mt-1 text-gray-500">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 이벤트 선택 (event_result 시) */}
        {reportType === 'event_result' && (
          <div>
            <p className="text-sm text-gray-400 mb-3">이벤트 선택</p>
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

        {/* 미리보기 */}
        {selectedEvent && reportType === 'event_result' && (
          <div className="bg-brand-bg border border-brand-border rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">미리보기</p>
            <p className="text-sm font-semibold text-white">{selectedEvent.name} 이벤트 결과 보고서</p>
            <p className="text-xs text-gray-500 mt-1">
              {selectedEvent.start_date} ~ {selectedEvent.end_date} | {selectedEvent.venue ?? 'TBD'}
            </p>
            <p className="text-xs text-gray-500 mt-1">포함 항목: 뷰어십 · 소셜 · 방송 · 경쟁 · 현장 KPI</p>
          </div>
        )}

        {/* Export 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={handleExcelExport}
            disabled={generating || !selectedEventId}
            className="px-5 py-2.5 rounded-lg bg-kpi-success/20 border border-kpi-success/40 text-kpi-success text-sm font-medium hover:bg-kpi-success/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? '생성 중...' : 'Excel Export (.xlsx)'}
          </button>
          <button
            disabled
            className="px-5 py-2.5 rounded-lg bg-brand-accent/10 border border-brand-accent/30 text-brand-accent text-sm font-medium opacity-40 cursor-not-allowed"
            title="PDF Export는 배포 단계에서 활성화됩니다"
          >
            PDF Export (준비 중)
          </button>
        </div>
      </section>

      {/* 리포트 히스토리 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">리포트 히스토리</h2>
          <div className="flex gap-2">
            {(['all', ...REPORT_TYPES.map((t) => t.value)] as const).map((v) => (
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
                {v === 'all' ? '전체' : TYPE_LABEL[v as ReportType]}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-12">리포트 없음</p>
        ) : (
          <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">제목</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">유형</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">생성자</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">생성일</th>
                  <th className="px-5 py-3 text-right text-gray-400 font-medium">다운로드</th>
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
                      {new Date(r.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.file_url ? (
                        <a href={r.file_url} className="text-brand-accent hover:underline text-xs">다운로드</a>
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
