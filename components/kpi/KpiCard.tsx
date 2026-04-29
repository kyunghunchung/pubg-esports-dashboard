import { cn, formatNumber } from '@/lib/utils'
import { GoalGauge } from './GoalGauge'

interface BadgeProp {
  text: string
  color: 'green' | 'yellow' | 'red'
}

interface Props {
  label: string
  sublabel?: string
  caption?: string
  tooltip?: string
  value: number
  unit?: string
  target?: number
  yoy?: number
  disabled?: boolean
  badge?: BadgeProp
  className?: string
}

const BADGE_STYLE: Record<BadgeProp['color'], string> = {
  green:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  yellow: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  red:    'text-red-400 bg-red-400/10 border-red-400/20',
}

export function KpiCard({ label, sublabel, caption, tooltip, value, unit, target, yoy, disabled, badge, className }: Props) {
  const hasYoy = yoy !== undefined && !disabled
  const yoyPositive = hasYoy && yoy! >= 0

  return (
    <div className={cn(
      'group relative bg-brand-surface border border-brand-border rounded-xl p-4 space-y-3 card-hover',
      disabled && 'opacity-40',
      className,
    )}>
      {/* 라벨 */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
            {tooltip && (
              <div className="relative group/tip">
                <span className="text-[10px] text-gray-700 hover:text-gray-500 cursor-default select-none">ⓘ</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-56 px-2.5 py-2 rounded-lg bg-brand-elevated border border-brand-border text-xs text-gray-300 leading-relaxed whitespace-pre-wrap pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 shadow-xl">
                  {tooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-brand-elevated" />
                </div>
              </div>
            )}
          </div>
          {sublabel && <p className="text-[10px] text-gray-700 mt-0.5 leading-none">{sublabel}</p>}
        </div>

        {/* YoY 배지 */}
        {hasYoy && (
          <span className={cn(
            'shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums',
            yoyPositive
              ? 'text-emerald-400 bg-emerald-400/10'
              : 'text-red-400 bg-red-400/10'
          )}>
            {yoyPositive ? '▲' : '▼'} {Math.abs(yoy!).toFixed(1)}%
          </span>
        )}
      </div>

      {/* 값 */}
      <div className="flex items-end justify-between gap-2">
        <div className="leading-none">
          {disabled ? (
            <span className="text-2xl font-bold text-gray-700">—</span>
          ) : (
            <span className="text-2xl font-bold tabular-nums num text-white tracking-tight">
              {formatNumber(value)}
              {unit && <span className="ml-1 text-sm font-normal text-gray-500">{unit}</span>}
            </span>
          )}
        </div>

        {badge && !disabled && (
          <span className={cn(
            'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md border',
            BADGE_STYLE[badge.color],
          )}>
            {badge.text}
          </span>
        )}
      </div>

      {target !== undefined && !disabled && (
        <GoalGauge actual={value} target={target} label={`목표: ${formatNumber(target)}${unit ?? ''}`} />
      )}
      {caption && !disabled && (
        <p className="text-[10px] text-gray-700 leading-relaxed">{caption}</p>
      )}
    </div>
  )
}
