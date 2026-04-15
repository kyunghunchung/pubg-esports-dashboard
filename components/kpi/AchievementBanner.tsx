import { cn, formatNumber } from '@/lib/utils'
import { calcAchievement, achievementColor } from '@/lib/kpi/achievement'

interface Props {
  metric: string
  target: number
  actual: number
  unit?: string
}

export function AchievementBanner({ metric, target, actual, unit = '' }: Props) {
  const { rate, status } = calcAchievement(metric, actual, target)
  const colors = achievementColor(status)

  return (
    <div className={cn('flex flex-wrap items-center gap-4 px-5 py-3 rounded-lg border', colors,
      status === 'danger'  ? 'border-kpi-danger/30'  :
      status === 'warning' ? 'border-kpi-warning/30' : 'border-kpi-success/30'
    )}>
      <div className="text-sm">
        <span className="text-gray-400 mr-1">목표</span>
        <span className="font-semibold text-white">{formatNumber(target)}{unit}</span>
      </div>
      <div className="text-sm">
        <span className="text-gray-400 mr-1">현재</span>
        <span className="font-semibold text-white">{formatNumber(actual)}{unit}</span>
      </div>
      <div className={cn('text-sm font-bold', colors.split(' ')[0])}>
        달성률 {rate.toFixed(1)}%
        {rate >= 100 ? ' ✓' : rate >= 80 ? ' ▲' : ' ▼'}
      </div>
    </div>
  )
}
