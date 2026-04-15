import Link from 'next/link'
import { getEvents } from '@/lib/db/events'
import { getReportHistory } from '@/lib/db/reports'
import { ReportsClient } from '@/components/reports/ReportsClient'

export default async function ReportsPage() {
  const [{ data: events }, { data: history }] = await Promise.all([
    getEvents(),
    getReportHistory(),
  ])

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">← 대시보드</Link>
          <h1 className="text-2xl font-bold">리포트</h1>
          <p className="text-sm text-gray-400 mt-1">이벤트 결과 보고서 · 주간 요약 · 연간 총결산 생성 및 다운로드</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <ReportsClient events={events} history={history} />
      </div>
    </main>
  )
}
