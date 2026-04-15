import { getEvents } from '@/lib/db/events'
import { getAllKpisForEvent } from '@/lib/db/kpis'
import { CompareClient } from '@/components/compare/CompareClient'
import Link from 'next/link'

export default async function ComparePage() {
  const { data: events } = await getEvents()

  // 완료된 이벤트의 KPI를 미리 모두 fetch
  const completed = events.filter((e) => e.status === 'completed')
  const kpisArray = await Promise.all(completed.map((e) => getAllKpisForEvent(e.id)))

  const allData = Object.fromEntries(
    completed.map((e, i) => [
      e.id,
      {
        event: e,
        viewership: kpisArray[i].viewership.data ?? [],
        social:     kpisArray[i].social.data     ?? [],
        targets:    kpisArray[i].targets.data     ?? [],
      },
    ])
  )

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">← 대시보드</Link>
          <h1 className="text-2xl font-bold">이벤트 비교 분석</h1>
          <p className="text-sm text-gray-400 mt-1">최대 3개 이벤트의 KPI를 나란히 비교합니다.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <CompareClient events={events} allData={allData} />
      </div>
    </main>
  )
}
