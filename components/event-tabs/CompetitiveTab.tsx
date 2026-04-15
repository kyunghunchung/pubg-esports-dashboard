import { formatNumber } from '@/lib/utils'
import type { CompetitiveKpi } from '@/types'

interface Props {
  competitive: CompetitiveKpi | null
}

export function CompetitiveTab({ competitive }: Props) {
  if (!competitive) {
    return <div className="flex items-center justify-center h-48 text-gray-500 text-sm">데이터 없음</div>
  }

  const stats = [
    { label: '참가 팀',     value: competitive.team_count,     unit: '팀' },
    { label: '참가 선수',   value: competitive.player_count,   unit: '명' },
    { label: '참가 국가',   value: competitive.country_count,  unit: '개국' },
    { label: '총 상금',     value: competitive.prize_pool_usd, unit: 'USD', format: (v: number) => `$${formatNumber(v)}` },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(({ label, value, unit, format }) => (
          <div key={label} className="bg-brand-surface border border-brand-border rounded-xl p-6 text-center">
            <p className="text-3xl font-bold text-white tabular-nums">
              {value != null ? (format ? format(value) : formatNumber(value)) : '—'}
            </p>
            <p className="text-sm text-gray-400 mt-1">{unit}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
        <p className="text-sm text-gray-500 text-center py-8">
          팀별 순위 테이블은 Phase 3 운영 데이터 연동 후 표시됩니다.
        </p>
      </div>
    </div>
  )
}
