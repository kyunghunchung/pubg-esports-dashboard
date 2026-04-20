import { formatNumber } from '@/lib/utils'
import type { CostreamingKpi } from '@/types'

interface Props {
  broadcast: CostreamingKpi | null
}

export function BroadcastTab({ broadcast }: Props) {
  if (!broadcast) {
    return <div className="flex items-center justify-center h-48 text-gray-500 text-sm">데이터 없음</div>
  }

  const rows = [
    { label: '총 방송 채널 수',      value: broadcast.channel_count,        unit: '개' },
    { label: '코스트리머 수',         value: broadcast.co_streamer_count,     unit: '명' },
    { label: '코스트리머 시청자 수',   value: broadcast.co_streamer_viewers,  unit: '명' },
    { label: '커버리지 지역 수',       value: broadcast.coverage_regions,     unit: '개국' },
    { label: '클립 조회 수',          value: broadcast.clip_views,           unit: '회' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {rows.map(({ label, value, unit }) => (
          <div key={label} className="bg-brand-surface border border-brand-border rounded-xl p-5 text-center">
            <p className="text-2xl font-bold text-white tabular-nums">
              {value != null ? formatNumber(value) : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">{unit}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="px-5 py-3 text-left text-gray-400 font-medium">지표</th>
              <th className="px-5 py-3 text-right text-gray-400 font-medium">값</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, value, unit }) => (
              <tr key={label} className="border-b border-brand-border last:border-0 hover:bg-white/5">
                <td className="px-5 py-3 text-gray-300">{label}</td>
                <td className="px-5 py-3 text-right font-semibold text-white tabular-nums">
                  {value != null ? `${formatNumber(value)} ${unit}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
