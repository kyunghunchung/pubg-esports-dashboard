import { cn, formatNumber } from '@/lib/utils'
import { GoalGauge } from './GoalGauge'

interface Props {
  label: string
  value: number
  unit?: string
  target?: number
  yoy?: number        // YoY 증감률 (%)
  className?: string
}

export function KpiCard({ label, value, unit, target, yoy, className }: Props) {
  const hasYoy = yoy !== undefined
  const yoyPositive = hasYoy && yoy >= 0

  return (
    <div className={cn('bg-brand-surface border border-brand-border rounded-xl p-5 space-y-3', className)}>
      <p className="text-sm text-gray-400 font-medium">{label}</p>

      <div className="flex items-end justify-between gap-2">
        <div>
          <span className="text-3xl font-bold tabular-nums text-white">
            {formatNumber(value)}
          </span>
          {unit && <span className="ml-1 text-sm text-gray-400">{unit}</span>}
        </div>

        {hasYoy && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              yoyPositive
                ? 'text-kpi-success bg-kpi-success/10'
                : 'text-kpi-danger bg-kpi-danger/10'
            )}
          >
            {yoyPositive ? '+' : ''}{yoy.toFixed(1)}% YoY
          </span>
        )}
      </div>

      {target !== undefined && (
        <GoalGauge actual={value} target={target} label={`목표: ${formatNumber(target)}${unit ?? ''}`} />
      )}
    </div>
  )
}
