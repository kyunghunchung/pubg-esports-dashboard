import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getEventById } from '@/lib/db/events'
import { getAllKpisForEvent } from '@/lib/db/kpis'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LiveBadge } from '@/components/kpi/LiveBadge'
import { ViewershipTab } from '@/components/event-tabs/ViewershipTab'
import { SocialTab } from '@/components/event-tabs/SocialTab'
import { BroadcastTab } from '@/components/event-tabs/BroadcastTab'
import { CompetitiveTab } from '@/components/event-tabs/CompetitiveTab'
import { LiveEventTab } from '@/components/event-tabs/LiveEventTab'

const STATUS_LABEL = { upcoming: '예정', live: 'LIVE', completed: '완료' }
const STATUS_COLOR = {
  upcoming:  'text-brand-accent bg-brand-accent/10 border-brand-accent/30',
  live:      'text-kpi-live bg-kpi-live/10 border-kpi-live/30',
  completed: 'text-gray-400 bg-gray-800 border-gray-700',
}

interface Props {
  params: { id: string }
}

export default async function EventDetailPage({ params }: Props) {
  const [{ data: event }, kpis] = await Promise.all([
    getEventById(params.id),
    getAllKpisForEvent(params.id),
  ])

  if (!event) notFound()

  const targets   = kpis.targets.data   ?? []
  const viewership = kpis.viewership.data ?? []
  const social    = kpis.social.data    ?? []
  const broadcast = kpis.broadcast.data
  const competitive = kpis.competitive.data
  const liveEvent = kpis.liveEvent.data

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      {/* 상단 헤더 */}
      <div className="border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">
            ← 대시보드
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-accent/20 text-brand-accent">
                {event.type}
              </span>
              <h1 className="text-2xl font-bold text-white">{event.name}</h1>
              {event.status === 'live' && <LiveBadge />}
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_COLOR[event.status]}`}>
              {STATUS_LABEL[event.status]}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
            {event.venue && <span>{event.venue}</span>}
            <span>
              {new Date(event.start_date).toLocaleDateString('ko-KR')} –{' '}
              {new Date(event.end_date).toLocaleDateString('ko-KR')}
            </span>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="viewership">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="viewership">📺 Viewership</TabsTrigger>
            <TabsTrigger value="social">📱 Social</TabsTrigger>
            <TabsTrigger value="broadcast">📡 Broadcast</TabsTrigger>
            <TabsTrigger value="competitive">⚔️ Competitive</TabsTrigger>
            <TabsTrigger value="live_event">🎟️ Live Event</TabsTrigger>
          </TabsList>

          <TabsContent value="viewership">
            <ViewershipTab viewership={viewership} targets={targets} />
          </TabsContent>

          <TabsContent value="social">
            <SocialTab social={social} targets={targets} />
          </TabsContent>

          <TabsContent value="broadcast">
            <BroadcastTab broadcast={broadcast} />
          </TabsContent>

          <TabsContent value="competitive">
            <CompetitiveTab competitive={competitive} />
          </TabsContent>

          <TabsContent value="live_event">
            <LiveEventTab liveEvent={liveEvent} targets={targets} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
