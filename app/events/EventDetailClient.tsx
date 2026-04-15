'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useDashboardData } from '@/lib/hooks/useDashboardData'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

const ViewershipTab  = dynamic(() => import('@/components/event-tabs/ViewershipTab').then(m => m.ViewershipTab),   { ssr: false })
const SocialTab      = dynamic(() => import('@/components/event-tabs/SocialTab').then(m => m.SocialTab),           { ssr: false })
const BroadcastTab   = dynamic(() => import('@/components/event-tabs/BroadcastTab').then(m => m.BroadcastTab),     { ssr: false })
const CompetitiveTab = dynamic(() => import('@/components/event-tabs/CompetitiveTab').then(m => m.CompetitiveTab), { ssr: false })
const LiveEventTab   = dynamic(() => import('@/components/event-tabs/LiveEventTab').then(m => m.LiveEventTab),     { ssr: false })

const TABS = [
  { key: 'viewership',  label: '📺 Viewership' },
  { key: 'social',      label: '📱 Social' },
  { key: 'broadcast',   label: '📡 Broadcast' },
  { key: 'competitive', label: '⚔️ Competitive' },
  { key: 'live_event',  label: '🎟️ Live Event' },
] as const

type TabKey = typeof TABS[number]['key']

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-gray-700 text-gray-300',
  live:      'bg-kpi-live/20 text-kpi-live border border-kpi-live/40',
  upcoming:  'bg-brand-accent/10 text-brand-accent border border-brand-accent/30',
}
const STATUS_LABEL: Record<string, string> = {
  completed: '종료', live: 'LIVE', upcoming: '예정',
}

function EventDetailInner() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''
  const { data, loading } = useDashboardData()
  const [tab, setTab] = useState<TabKey>('viewership')

  if (loading && !data) return <div className="min-h-screen bg-brand-bg" />

  if (!data || !data.events.length) {
    return (
      <main className="min-h-screen bg-brand-bg text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-5xl">📂</p>
          <h2 className="text-xl font-bold">데이터가 없습니다</h2>
          <Link href="/upload" className="inline-block mt-2 px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80">
            데이터 업로드 →
          </Link>
        </div>
      </main>
    )
  }

  const event = data.events.find(e => e.id === id)
  if (!event) {
    return (
      <main className="min-h-screen bg-brand-bg text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-5xl">🔍</p>
          <h2 className="text-xl font-bold">이벤트를 찾을 수 없습니다</h2>
          <Link href="/dashboard" className="inline-block mt-2 px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80">
            대시보드로 돌아가기
          </Link>
        </div>
      </main>
    )
  }

  const viewership  = data.viewership.filter(v => v.event_id === id)
  const social      = data.social.filter(s => s.event_id === id)
  const broadcast   = data.broadcast.filter(b => b.event_id === id)[0] ?? null
  const competitive = data.competitive.filter(c => c.event_id === id)[0] ?? null
  const liveEvent   = data.live_event.filter(l => l.event_id === id)[0] ?? null
  const targets     = data.kpi_targets.filter(t => t.event_id === id)

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      {/* 헤더 */}
      <div className="border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">
            ← 대시보드
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{event.name}</h1>
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', STATUS_BADGE[event.status])}>
                  {STATUS_LABEL[event.status]}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {event.start_date} ~ {event.end_date}
                {event.venue  && ` · ${event.venue}`}
                {event.region && ` · ${event.region}`}
              </p>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                  tab === t.key
                    ? 'border-brand-accent text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {tab === 'viewership'  && <ViewershipTab  viewership={viewership}   targets={targets} />}
        {tab === 'social'      && <SocialTab      social={social}           targets={targets} />}
        {tab === 'broadcast'   && <BroadcastTab   broadcast={broadcast} />}
        {tab === 'competitive' && <CompetitiveTab competitive={competitive} />}
        {tab === 'live_event'  && <LiveEventTab   liveEvent={liveEvent}     targets={targets} />}
      </div>
    </main>
  )
}

export function EventDetailClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-bg" />}>
      <EventDetailInner />
    </Suspense>
  )
}
