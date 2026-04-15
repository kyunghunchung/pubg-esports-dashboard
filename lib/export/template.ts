import * as XLSX from 'xlsx'
import {
  VIEWERSHIP_PLATFORMS,
  SOCIAL_PLATFORMS,
  ALL_EVENT_TYPES,
  MIN_YEAR,
} from '@/lib/config/constants'

function makeSheet(headers: string[], example: (string | number)[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  ws['!cols'] = headers.map(() => ({ wch: 22 }))
  return ws
}

/** 참고 시트: key/value 목록을 테이블로 만들기 */
function makeRefSheet(title: string, items: [string, string][]) {
  const rows: (string | number)[][] = [
    [title, '설명'],
    ...items,
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 28 }, { wch: 40 }]
  return ws
}

export function generateUploadTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new()

  // ── 이벤트 ────────────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '유형', '연도', '시작일', '종료일', '장소', '지역', '상태'],
    ['PNC 2025', 'PNC', 2025, '2025-07-31', '2025-08-03', 'Seoul, Korea', 'Global', 'completed'],
  ), '이벤트')

  // 이벤트 참고
  const eventTypeItems = Object.entries(ALL_EVENT_TYPES).map(
    ([id, name]) => [id, name] as [string, string]
  )
  XLSX.utils.book_append_sheet(wb, makeRefSheet('유형(type) 입력값', [
    ...eventTypeItems,
    ['──', '──'],
    ['상태(status)', ''],
    ['upcoming', '예정'],
    ['live', '진행 중'],
    ['completed', '종료'],
    ['──', '──'],
    [`최소 연도`, `${MIN_YEAR}년 이후 데이터만 집계됩니다`],
  ]), '이벤트_참고')

  // ── 뷰어십 ───────────────────────────────────────────────
  const viewershipPlatformExample = Object.keys(VIEWERSHIP_PLATFORMS)[0] // 'twitch'
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '플랫폼', 'Peak CCV', 'ACV', 'Hours Watched', '순 시청자 수', '방송 시간(h)', '기록일(YYYY-MM-DD)'],
    ['PNC 2025', viewershipPlatformExample, 423000, 187000, 3712000, 1840000, 90, '2025-08-03'],
  ), '뷰어십')

  XLSX.utils.book_append_sheet(wb, makeRefSheet('뷰어십 플랫폼 입력값', [
    ...Object.entries(VIEWERSHIP_PLATFORMS).map(([id, label]) => [id, label] as [string, string]),
    ['──', '──'],
    ['플랫폼별 행 분리', '플랫폼마다 한 행씩 입력하세요'],
    ['전체 합산은 total', '모든 플랫폼 합산 시 total 사용'],
  ]), '뷰어십_플랫폼참고')

  // ── 소셜 ─────────────────────────────────────────────────
  const socialPlatformExample = Object.keys(SOCIAL_PLATFORMS)[0] // 'x'
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '플랫폼', '노출(Impressions)', '반응(Engagements)', '영상 뷰', '팔로워 증감', '기록일(YYYY-MM-DD)'],
    ['PNC 2025', socialPlatformExample, 2800000, 215000, 740000, 18900, '2025-08-03'],
  ), '소셜')

  XLSX.utils.book_append_sheet(wb, makeRefSheet('소셜 플랫폼 입력값', [
    ...Object.entries(SOCIAL_PLATFORMS).map(([id, label]) => [id, label] as [string, string]),
  ]), '소셜_플랫폼참고')

  // ── 방송 ─────────────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '채널 수', '코스트리머 수', '코스트리머 시청자', '커버리지 국가 수', '클립 조회수', '기록일(YYYY-MM-DD)'],
    ['PNC 2025', 18, 42, 280000, 12, 4200000, '2025-08-03'],
  ), '방송')

  // ── 경쟁 ─────────────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '팀 수', '선수 수', '참가 국가 수', '상금(USD)', '기록일(YYYY-MM-DD)'],
    ['PNC 2025', 16, 64, 16, 500000, '2025-08-03'],
  ), '경쟁')

  // ── 현장 ─────────────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '총 관객 수', '티켓 판매율(0~1)', '평균 좌석 점유율(0~1)', '기록일(YYYY-MM-DD)'],
    ['PNC 2025', 7420, 0.928, 0.895, '2025-08-03'],
  ), '현장')

  // ── KPI 목표값 ────────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '카테고리', '지표명(metric)', '목표값', '단위'],
    ['PNC 2025', 'viewership', 'peak_ccv', 500000, '명'],
  ), 'KPI목표값')

  XLSX.utils.book_append_sheet(wb, makeRefSheet('KPI 지표 입력값', [
    ['카테고리', '지표명(metric)'],
    ['viewership', 'peak_ccv'],
    ['viewership', 'unique_viewers'],
    ['viewership', 'hours_watched'],
    ['viewership', 'acv'],
    ['viewership', 'hours_broadcast'],
    ['social', 'impressions'],
    ['social', 'engagements'],
    ['social', 'video_views'],
    ['live_event', 'total_attendance'],
    ['competitive', 'prize_pool_usd'],
  ]), '목표값_참고')

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Uint8Array(buf)
}
