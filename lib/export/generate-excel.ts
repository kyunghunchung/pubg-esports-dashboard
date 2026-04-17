import * as XLSX from 'xlsx'
import type { Event, ViewershipKpi, SocialKpi } from '@/types'

export function generateEventExcel(event: Event, viewership: ViewershipKpi[], social: SocialKpi[]): Uint8Array {
  const wb = XLSX.utils.book_new()

  // 뷰어십 시트 (v5 스펙: PCCV / ACCV / UV / Stability Ratio)
  const viewershipRows = viewership.map((v) => {
    const pccv = v.peak_ccv ?? 0
    const accv = v.acv ?? 0
    const stability = pccv > 0 ? Math.round((accv / pccv) * 100) : null
    return {
      플랫폼: v.platform,
      PCCV: pccv,
      ACCV: accv,
      'Unique Viewers': v.unique_viewers ?? 0,
      'Stability Ratio (%)': stability ?? '',
    }
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(viewershipRows), '뷰어십')

  // 소셜 시트
  const socialRows = social.map((s) => ({
    플랫폼: s.platform,
    노출: s.impressions,
    반응: s.engagements,
    '영상 뷰': s.video_views,
    '팔로워 증감': s.follower_delta,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(socialRows), '소셜')

  // 이벤트 정보 시트
  const infoRows = [
    { 항목: '이벤트명', 값: event.name },
    { 항목: '유형', 값: event.type },
    { 항목: '연도', 값: event.year },
    { 항목: '시작일', 값: event.start_date },
    { 항목: '종료일', 값: event.end_date },
    { 항목: '개최지', 값: event.venue ?? '-' },
    { 항목: '상태', 값: event.status },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(infoRows), '이벤트 정보')

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Uint8Array(buf)
}
