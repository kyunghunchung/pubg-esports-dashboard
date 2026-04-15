import { AchievementBanner } from '@/components/kpi/AchievementBanner'
import { formatNumber, formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { LiveEventKpi, KpiTarget } from '@/types'

interface Props {
  liveEvent: LiveEventKpi | null
  targets: KpiTarget[]
}

export function LiveEventTab({ liveEvent, targets }: Props) {
  const getTarget = (metric: string) =>
    targets.find((t) => t.category === 'live_event' && t.metric === metric)?.target_value ?? 0

  if (!liveEvent) {
    return <div className="flex items-center justify-center h-48 text-gray-500 text-sm">현장 이벤트 데이터 없음</div>
  }

  const occupancyPct = (liveEvent.avg_occupancy ?? 0) * 100
  const salesRatePct = (liveEvent.ticket_sales_rate ?? 0) * 100

  return (
    <div className="space-y-6">
      {getTarget('total_attendance') > 0 && (
        <AchievementBanner
          metric="총 관객 수"
          target={getTarget('total_attendance')}
          actual={liveEvent.total_attendance ?? 0}
          unit="명"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 총 관객 */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 text-center">
          <p className="text-4xl font-bold text-white tabular-nums">
            {formatNumber(liveEvent.total_attendance ?? 0)}
          </p>
          <p className="text-sm text-gray-400 mt-1">명</p>
          <p className="text-xs text-gray-500 mt-1">총 관객 수</p>
        </div>

        {/* 티켓 판매율 */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-3">티켓 판매율</p>
          <p className={cn('text-3xl font-bold tabular-nums', salesRatePct >= 90 ? 'text-kpi-success' : salesRatePct >= 70 ? 'text-kpi-warning' : 'text-kpi-danger')}>
            {formatPercent(salesRatePct)}
          </p>
          <div className="mt-3 h-2 bg-brand-border rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', salesRatePct >= 90 ? 'bg-kpi-success' : salesRatePct >= 70 ? 'bg-kpi-warning' : 'bg-kpi-danger')}
              style={{ width: `${Math.min(salesRatePct, 100)}%` }}
            />
          </div>
        </div>

        {/* 평균 좌석 점유율 */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-3">평균 좌석 점유율</p>
          <p className={cn('text-3xl font-bold tabular-nums', occupancyPct >= 90 ? 'text-kpi-success' : occupancyPct >= 70 ? 'text-kpi-warning' : 'text-kpi-danger')}>
            {formatPercent(occupancyPct)}
          </p>
          <div className="mt-3 h-2 bg-brand-border rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', occupancyPct >= 90 ? 'bg-kpi-success' : occupancyPct >= 70 ? 'bg-kpi-warning' : 'bg-kpi-danger')}
              style={{ width: `${Math.min(occupancyPct, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
