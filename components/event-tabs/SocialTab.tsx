import { AchievementBanner } from '@/components/kpi/AchievementBanner'
import { SocialBarChart } from '@/components/charts/SocialBarChart'
import { formatNumber } from '@/lib/utils'
import type { SocialKpi, KpiTarget } from '@/types'

interface Props {
  social: SocialKpi[]
  targets: KpiTarget[]
}

const PLATFORM_LABEL: Record<string, string> = {
  x: 'X (Twitter)', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube',
}

export function SocialTab({ social, targets }: Props) {
  const totalImpressions = social.reduce((s, r) => s + r.impressions, 0)
  const totalEngagements = social.reduce((s, r) => s + r.engagements, 0)

  const getTarget = (metric: string) =>
    targets.find((t) => t.category === 'social' && t.metric === metric)?.target_value ?? 0

  const chartData = social.map((s) => ({
    platform: PLATFORM_LABEL[s.platform] ?? s.platform,
    impressions: s.impressions,
    engagements: s.engagements,
    video_views: s.video_views,
  }))

  return (
    <div className="space-y-6">
      {getTarget('impressions') > 0 && (
        <AchievementBanner metric="소셜 노출" target={getTarget('impressions')} actual={totalImpressions} unit="회" />
      )}

      {/* 플랫폼별 상세 테이블 */}
      <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="px-5 py-3 text-left text-gray-400 font-medium">플랫폼</th>
              <th className="px-5 py-3 text-right text-gray-400 font-medium">노출</th>
              <th className="px-5 py-3 text-right text-gray-400 font-medium">반응</th>
              <th className="px-5 py-3 text-right text-gray-400 font-medium">영상 뷰</th>
              <th className="px-5 py-3 text-right text-gray-400 font-medium">팔로워 증감</th>
            </tr>
          </thead>
          <tbody>
            {social.map((s) => (
              <tr key={s.platform} className="border-b border-brand-border last:border-0 hover:bg-white/5">
                <td className="px-5 py-3 text-white font-medium">{PLATFORM_LABEL[s.platform] ?? s.platform}</td>
                <td className="px-5 py-3 text-right tabular-nums text-gray-200">{formatNumber(s.impressions)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-gray-200">{formatNumber(s.engagements)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-gray-200">{formatNumber(s.video_views)}</td>
                <td className={`px-5 py-3 text-right tabular-nums font-semibold ${s.follower_delta >= 0 ? 'text-kpi-success' : 'text-kpi-danger'}`}>
                  {s.follower_delta >= 0 ? '+' : ''}{formatNumber(s.follower_delta)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-white/5">
              <td className="px-5 py-3 text-white font-semibold">합계</td>
              <td className="px-5 py-3 text-right tabular-nums text-white font-semibold">{formatNumber(totalImpressions)}</td>
              <td className="px-5 py-3 text-right tabular-nums text-white font-semibold">{formatNumber(totalEngagements)}</td>
              <td className="px-5 py-3 text-right tabular-nums text-white font-semibold">
                {formatNumber(social.reduce((s, r) => s + r.video_views, 0))}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-white font-semibold">
                {(() => {
                  const d = social.reduce((s, r) => s + r.follower_delta, 0)
                  return `${d >= 0 ? '+' : ''}${formatNumber(d)}`
                })()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 바 차트 */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">채널별 성과 비교</h3>
        <SocialBarChart data={chartData} />
      </div>
    </div>
  )
}
