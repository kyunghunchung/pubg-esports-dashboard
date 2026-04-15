import { getEvents, getLiveEvents } from '@/lib/db/events'
import { getViewershipKpis, getSocialKpis, getKpiTargets } from '@/lib/db/kpis'
import { KpiCard } from '@/components/kpi/KpiCard'
import { LiveBadge } from '@/components/kpi/LiveBadge'
import { TournamentFilter } from '@/components/dashboard/TournamentFilter'
import { MOCK_CCV_BY_LANGUAGE, MOCK_SOCIAL_BY_LANGUAGE } from '@/lib/mock-data'
import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

const CcvByLanguageChart = nextDynamic(
  () => import('@/components/charts/CcvByLanguageChart').then((m) => m.CcvByLanguageChart),
  { ssr: false },
)
const SocialByLanguageChart = nextDynamic(
  () => import('@/components/charts/SocialByLanguageChart').then((m) => m.SocialByLanguageChart),
  { ssr: false },
)

const DEMO_EVENT_ID = '11111111-0000-0000-0000-000000000001'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { event?: string }
}) {
  const [{ data: events }, { data: liveEvents }] = await Promise.all([
    getEvents(),
    getLiveEvents(),
  ])

  // 선택된 대회 결정 (URL 파라미터 → 첫 번째 completed → fallback)
  const completedFirst = (events ?? []).find((e) => e.status === 'completed')
  const defaultId = completedFirst?.id ?? events?.[0]?.id ?? DEMO_EVENT_ID
  const selectedId = searchParams.event ?? defaultId
  const selectedEvent = (events ?? []).find((e) => e.id === selectedId)

  const [{ data: viewership }, { data: social }, { data: targets }] = await Promise.all([
    getViewershipKpis(selectedId),
    getSocialKpis(selectedId),
    getKpiTargets(selectedId),
  ])

  const isLive = (liveEvents ?? []).length > 0
  const liveEvent = liveEvents?.[0]

  // 뷰어십 KPI
  const total = viewership?.find((v) => v.platform === 'total')
  const peakCcv      = total?.peak_ccv       ?? 0
  const uniqueViewers = total?.unique_viewers ?? 0
  const hoursWatched  = total?.hours_watched  ?? 0

  // 소셜 KPI (언어별 합산)
  const socialByLang = MOCK_SOCIAL_BY_LANGUAGE[selectedId] ?? []
  const totalImpressions  = socialByLang.reduce((s, l) => s + l.impressions,   0)
  const totalContentCount = socialByLang.reduce((s, l) => s + l.content_count, 0)

  // 차트 데이터
  const ccvByLang = MOCK_CCV_BY_LANGUAGE[selectedId] ?? []

  // 목표값 헬퍼
  const getTarget = (metric: string) =>
    targets?.find((t) => t.metric === metric)?.target_value

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      {/* Live 배너 */}
      {isLive && liveEvent && (
        <div className="w-full bg-kpi-live/10 border-b border-kpi-live/30 px-6 py-3 flex items-center gap-3">
          <LiveBadge />
          <span className="text-sm font-semibold text-white">{liveEvent.name}</span>
          <span className="text-sm text-gray-400">진행 중</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* 헤더 + 대회 필터 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">PUBG Esports 대시보드</h1>
            <p className="text-sm text-gray-400 mt-1">
              {selectedEvent
                ? `${selectedEvent.name} · ${selectedEvent.venue ?? selectedEvent.region ?? ''}`
                : 'Krafton 이스포츠실 내부 KPI 모니터링'}
            </p>
          </div>
          <TournamentFilter events={events ?? []} selectedId={selectedId} />
        </div>

        {/* 핵심 KPI 5종 */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">핵심 KPI</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard
              label="Peak CCV"
              value={peakCcv}
              unit="명"
              target={getTarget('peak_ccv')}
            />
            <KpiCard
              label="Unique Viewers"
              value={uniqueViewers}
              unit="명"
              target={getTarget('unique_viewers')}
            />
            <KpiCard
              label="Total Hours Watched"
              value={hoursWatched}
              unit="시간"
              target={getTarget('hours_watched')}
            />
            <KpiCard
              label="콘텐츠 발행 수"
              value={totalContentCount}
              unit="건"
            />
            <KpiCard
              label="콘텐츠 노출"
              value={totalImpressions}
              unit="회"
              target={getTarget('impressions')}
            />
          </div>
        </section>

        {/* 플랫폼별 CCV (언어별) */}
        <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-300">플랫폼별 CCV</h2>
            <p className="text-xs text-gray-500 mt-0.5">언어별 Peak CCV · 플랫폼 스택</p>
          </div>
          <CcvByLanguageChart data={ccvByLang} />
        </section>

        {/* 소셜 채널별 성과 (언어별) */}
        <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-300">소셜 채널별 성과</h2>
            <p className="text-xs text-gray-500 mt-0.5">언어별 노출·반응 (막대) / 콘텐츠 발행 수 (선, 우축)</p>
          </div>
          <SocialByLanguageChart data={socialByLang} />
        </section>
      </div>
    </main>
  )
}
