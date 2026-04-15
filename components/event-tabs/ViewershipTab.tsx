import { AchievementBanner } from '@/components/kpi/AchievementBanner'
import { CcvLineChart } from '@/components/charts/CcvLineChart'
import { PlatformDonut } from '@/components/charts/PlatformDonut'
import { formatNumber } from '@/lib/utils'
import type { ViewershipKpi, KpiTarget } from '@/types'

interface Props {
  viewership: ViewershipKpi[]
  targets: KpiTarget[]
}

export function ViewershipTab({ viewership, targets }: Props) {
  const total = viewership.find((v) => v.platform === 'total')
  const platforms = viewership.filter((v) => v.platform !== 'total')

  const getTarget = (metric: string) =>
    targets.find((t) => t.category === 'viewership' && t.metric === metric)?.target_value ?? 0

  // CCV 차트 데이터
  const ccvChartData = platforms.map((v) => ({
    date: new Date(v.recorded_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
    total: v.peak_ccv ?? 0,
    [v.platform]: v.peak_ccv ?? 0,
  }))

  // 플랫폼 분포 도넛
  const donutData = platforms.map((v) => ({
    name: v.platform,
    value: v.peak_ccv ?? 0,
  }))

  const rows = [
    { label: 'Peak CCV',        value: total?.peak_ccv,       unit: '명',  metric: 'peak_ccv' },
    { label: 'ACV',             value: total?.acv,            unit: '명',  metric: 'acv' },
    { label: 'Hours Watched',   value: total?.hours_watched,  unit: '시간', metric: 'hours_watched' },
    { label: 'Unique Viewers',  value: total?.unique_viewers, unit: '명',  metric: 'unique_viewers' },
    { label: 'Hours Broadcast', value: total?.hours_broadcast,unit: '시간', metric: 'hours_broadcast' },
  ]

  return (
    <div className="space-y-6">
      {/* 목표 달성 배너 */}
      {getTarget('peak_ccv') > 0 && (
        <AchievementBanner
          metric="Peak CCV"
          target={getTarget('peak_ccv')}
          actual={total?.peak_ccv ?? 0}
          unit="명"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI 요약 테이블 */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">지표 요약</h3>
          <table className="w-full text-sm">
            <tbody>
              {rows.map(({ label, value, unit }) => (
                <tr key={label} className="border-b border-brand-border last:border-0">
                  <td className="py-2 text-gray-400">{label}</td>
                  <td className="py-2 text-right font-semibold text-white tabular-nums">
                    {value != null ? `${formatNumber(value)} ${unit}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 플랫폼 분포 도넛 */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">플랫폼 분포 (Peak CCV)</h3>
          <PlatformDonut data={donutData} />
        </div>

        {/* CCV 차트 */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">플랫폼별 CCV</h3>
          <CcvLineChart data={ccvChartData} showPlatforms />
        </div>
      </div>
    </div>
  )
}
