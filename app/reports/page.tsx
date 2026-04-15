'use client'

import Link from 'next/link'
import { useDashboardData } from '@/lib/hooks/useDashboardData'
import dynamic from 'next/dynamic'

const ReportsClient = dynamic(
  () => import('@/components/reports/ReportsClient').then(m => m.ReportsClient),
  { ssr: false },
)

export default function ReportsPage() {
  const { data, loading } = useDashboardData()

  if (loading && !data) return <div className="min-h-screen bg-brand-bg" />

  if (!data || !data.events.length) {
    return (
      <main className="min-h-screen bg-brand-bg text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-5xl">📂</p>
          <h2 className="text-xl font-bold">업로드된 데이터가 없습니다</h2>
          <p className="text-gray-400 text-sm">엑셀 파일을 업로드하면 리포트를 생성할 수 있습니다.</p>
          <Link href="/upload" className="inline-block mt-2 px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80">
            데이터 업로드 →
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">
            ← 대시보드
          </Link>
          <h1 className="text-2xl font-bold">리포트</h1>
          <p className="text-sm text-gray-400 mt-1">이벤트 KPI 리포트 생성 및 Excel 다운로드</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <ReportsClient
          events={data.events}
          history={[]}
          viewership={data.viewership}
          social={data.social}
        />
      </div>
    </main>
  )
}
