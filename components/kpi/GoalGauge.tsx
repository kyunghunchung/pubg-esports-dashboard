import { cn } from '@/lib/utils'
import { achievementColor, calcAchievement } from '@/lib/kpi/achievement'

interface Props {
  actual: number
  target: number
  label?: string
}

export function GoalGauge({ actual, target, label }: Props) {
  const { rate, status } = calcAchievement('', actual, target)
  const pct = Math.min(rate, 100)
  const colorClass = achievementColor(status)

  return (
    <div className="w-full space-y-1">
      {label && <p className="text-xs text-gray-400">{label}</p>}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-brand-border rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', {
              'bg-kpi-danger':  status === 'danger',
              'bg-kpi-warning': status === 'warning',
              'bg-kpi-success': status === 'success',
            })}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cn('text-xs font-semibold tabular-nums', colorClass.split(' ')[0])}>
          {rate.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}
