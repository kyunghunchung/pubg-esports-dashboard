import { cn, formatNumber } from '@/lib/utils'
import { GoalGauge } from './GoalGauge'

interface BadgeProp {
  text: string
  color: 'green' | 'yellow' | 'red'
}

interface Props {
  label: string
  sublabel?: string   // 카드 상단 보조 설명
  value: number
  unit?: string
  target?: number
  yoy?: number        // YoY 증감률 (%)
  disabled?: boolean  // 집계 불가 시 "--" 표시
  badge?: BadgeProp   // 상태 뱃지 (Stability Ratio 등)
  className?: string
}

const BADGE_STYLE: Record<BadgeProp['color'], string> = {
  green:  'text-green-400 bg-green-400/10 border-green-400/20',
  yellow: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  red:    'text-red-400 bg-red-400/10 border-red-400/20',
}

export function KpiCard({ label, sublabel, value, unit, target, yoy, disabled, badge, className }: Props) {
  const hasYoy = yoy !== undefined && !disabled
  const yoyPositive = hasYoy && yoy! >= 0

  return (
    <div className={cn(
      'bg-brand-surface border border-brand-border rounded-xl p-5 space-y-3',
      disabled && 'opacity-50',
      className,
    )}>
      <div>
        <p className="text-sm text-gray-400 font-medium">{label}</p>
        {sublabel && <p className="text-xs text-gray-600 mt-0.5">{sublabel}</p>}
      </div>

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

        <div className="flex flex-col items-end gap-1">
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
          {badge && !disabled && (
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full border',
              BADGE_STYLE[badge.color],
            )}>
              {badge.text}
            </span>
          )}
        </div>
      </div>

      {target !== undefined && !disabled && (
        <GoalGauge actual={value} target={target} label={`목표: ${formatNumber(target)}${unit ?? ''}`} />
      )}
    </div>
  )
}
