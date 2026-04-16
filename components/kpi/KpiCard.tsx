import { cn, formatNumber } from '@/lib/utils'
import { GoalGauge } from './GoalGauge'

interface Props {
  label: string
  value: number
  unit?: string
  target?: number
  yoy?: number        // YoY 증감률 (%)
  disabled?: boolean  // 집계 불가 시 "--" 표시
  className?: string
}

export function KpiCard({ label, value, unit, target, yoy, disabled, className }: Props) {
  const hasYoy = yoy !== undefined && !disabled
  const yoyPositive = hasYoy && yoy! >= 0

  return (
    <div className={cn(
      'bg-brand-surface border border-brand-border rounded-xl p-5 space-y-3',
      disabled && 'opacity-50',
      className,
    )}>
      <p className="text-sm text-gray-400 font-medium">{label}</p>

      <div className="flex items-end justify-between gap-2">
        <div>
          {disabled ? (
            <span className="text-3xl font-bold tabular-nums text-gray-500">—</span>
          ) : (
            <>
              <span className="text-3xl font-bold tabular-nums text-white">
                {formatNumber(value)}
              </span>
              {unit && <span className="ml-1 text-sm text-gray-400">{unit}</span>}
            </>
          )}
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
            {yoyPositive ? '+' : ''}{yoy!.toFixed(1)}% YoY
          </span>
        )}
      </div>

      {target !== undefined && !disabled && (
        <GoalGauge actual={value} target={target} label={`목표: ${formatNumber(target)}${unit ?? ''}`} />
      )}
    </div>
  )
}
