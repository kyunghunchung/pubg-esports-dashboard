'use client'

import Link from 'next/link'
import { useDashboardData } from '@/lib/hooks/useDashboardData'
import dynamic from 'next/dynamic'

const CompareClient = dynamic(
  () => import('@/components/compare/CompareClient').then(m => m.CompareClient),
  { ssr: false },
)

export default function ComparePage() {
  const { data, loading } = useDashboardData()

  if (loading && !data) return <div className="min-h-screen bg-brand-bg" />

  if (!data || !data.events.length) {
    return (
      <main className="min-h-screen bg-brand-bg text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-5xl">📂</p>
          <h2 className="text-xl font-bold">업로드된 데이터가 없습니다</h2>
          <p className="text-gray-400 text-sm">엑셀 파일을 업로드하면 비교 분석이 가능합니다.</p>
          <Link href="/data-upload" className="inline-block mt-2 px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80">
            데이터 업로드 →
          </Link>
        </div>
      </main>
    )
  }

  // CompareClient 가 요구하는 allData 구조 생성
  const allData = Object.fromEntries(
    data.events.map(event => [
      event.id,
      {
        event,
        viewership: data.viewership.filter(v => v.event_id === event.id),
        social:     data.social.filter(s => s.event_id === event.id),
        targets:    data.kpi_targets.filter(t => t.event_id === event.id),
      },
    ])
  )

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">
            ← 대시보드
          </Link>
          <h1 className="text-2xl font-bold">이벤트 비교 분석</h1>
          <p className="text-sm text-gray-400 mt-1">최대 3개 이벤트의 KPI 달성도를 나란히 비교합니다</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <CompareClient events={data.events} allData={allData} />
      </div>
    </main>
  )
}
