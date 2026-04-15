import type { KpiAchievement } from '@/types'

export function calcAchievement(
  metric: string,
  actual: number,
  target: number,
  unit?: string
): KpiAchievement {
  const rate = target > 0 ? (actual / target) * 100 : 0
  return {
    metric,
    target,
    actual,
    rate,
    status: rate < 80 ? 'danger' : rate < 100 ? 'warning' : 'success',
    unit,
  }
}

export function achievementColor(status: KpiAchievement['status']) {
  return {
    danger:  'text-red-400 bg-red-950/40',
    warning: 'text-yellow-400 bg-yellow-950/40',
    success: 'text-green-400 bg-green-950/40',
  }[status]
}
