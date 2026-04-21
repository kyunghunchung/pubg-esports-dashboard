import * as XLSX from 'xlsx'
import { EVENT_MASTER } from '@/lib/config/event-master'
import { PLATFORMS } from '@/lib/config/constants'

function makeSheet(headers: string[], rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map(() => ({ wch: 22 }))
  return ws
}

function toBytes(wb: XLSX.WorkBook): Uint8Array {
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)
}

/** 유효 event_id 목록 시트 — 모든 템플릿에 공통 첨부 */
function makeEventIdSheet() {
  return makeSheet(
    ['event_id', 'display_name', 'year', 'is_global'],
    EVENT_MASTER.map(e => [e.event_id, e.display_name, e.year, e.is_global ? 'true' : 'false']),
  )
}

/** 유효 플랫폼 목록 시트 — 모든 템플릿에 공통 첨부 */
function makePlatformSheet() {
  return makeSheet(
    ['Platform (입력값)', 'Key (DB 저장값)'],
    Object.entries(PLATFORMS).map(([key, label]) => [label, key]),
  )
}

/** template_viewership.xlsx */
export function generateViewershipTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new()
  // Platform: 비워두면 Type A (통합), 입력하면 Type B (플랫폼 분리)
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['event_id', 'Platform (Optional)', 'PCCV', 'ACCV', 'Unique Viewers', 'Hours Watched', 'Official', 'Stability Ratio'],
    [
      // Type A 예시 — Platform 비워두기 (통합) / Official: Y or N
      ['PNC_2025',  '',           850000, 420000, 2100000, 3780000, 'Y', '자동계산'],
      // Type B 예시 — Platform 별도 입력
      ['PGC_2025',  'Twitch',     500000, 240000, 1200000, 2160000, 'Y', '자동계산'],
      ['PGC_2025',  'YouTube',    280000, 140000,  700000, 1260000, 'Y', '자동계산'],
      ['PGC_2025',  'SOOP Korea',  70000,  40000,  200000,  360000, 'Y', '자동계산'],
      ['PGC_2025',  'CHZZK',       50000,  25000,  120000,  216000, 'N', '자동계산'],
    ],
  ), 'Viewership')
  XLSX.utils.book_append_sheet(wb, makeEventIdSheet(), '유효 event_id 목록')
  XLSX.utils.book_append_sheet(wb, makePlatformSheet(), '유효 플랫폼 목록')
  return toBytes(wb)
}

/** template_contents.xlsx */
export function generateContentsTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['event_id', 'Date', 'Platform', 'Region / Language', 'Content Type 1', 'Content Type 2',
     'Number of Contents', 'Impression', 'Views', 'Engagements', 'Follower Delta'],
    [
      ['PNC_2025', '2025-06-20', 'YouTube',          'KR', '숏폼',  '하이라이트', 12, 2800000,  740000, 48200,  1500],
      ['PNC_2025', '2025-06-21', 'TikTok',           'EN', '숏폼',  '하이라이트',  5, 1200000, 3200000, 23800,   800],
      ['PNC_2025', '2025-06-21', 'Facebook',         'KR', '롱폼',  '프로모션',   20, 4500000,  980000, 93500,  2200],
      ['PNC_2025', '2025-06-22', 'SOOP Korea',       'KR', '포스트', '하이핑',    30,  980000,       0, 12900,   300],
      ['PNC_2025', '2025-06-22', 'CHZZK',            'KR', '숏폼',  '하이라이트',  8,  650000,  320000,  9450,   200],
      ['PNC_2025', '2025-06-23', 'Weibo',            'CN', '숏폼',  '하이라이트', 10,  870000,  410000, 34000,  1200],
      ['PNC_2025', '2025-06-23', 'Douyin',           'CN', '숏폼',  '하이라이트',  7, 1100000,  920000, 55000,  2100],
      ['PNC_2025', '2025-06-23', 'Official Community','KR', '포스트', '프로모션',  15,  430000,       0, 18000,   600],
    ],
  ), 'Contents')
  XLSX.utils.book_append_sheet(wb, makeEventIdSheet(), '유효 event_id 목록')
  XLSX.utils.book_append_sheet(wb, makePlatformSheet(), '유효 플랫폼 목록')
  return toBytes(wb)
}

/** template_costreaming.xlsx */
export function generateCostreamingTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['event_id', 'Region / Language', 'Streamer Name', 'Platform', 'PCCV', 'ACCV', 'Hours Watched', 'Cost', 'Currency'],
    [
      ['PNC_2025', 'KR',  'StreamerA', 'SOOP Korea',  85000, 42000, 756000, 3000000, 'KRW'],
      ['PNC_2025', 'KR',  'StreamerB', 'CHZZK',       62000, 31000, 558000, 2500000, 'KRW'],
      ['PNC_2025', 'EN',  'StreamerC', 'Twitch',      45000, 22000, 405000,    2000, 'USD'],
      ['PNC_2025', 'JP',  'StreamerD', 'YouTube',     28000, 14000, 252000,  150000, 'JPY'],
      ['PNC_2025', 'SEA', 'StreamerE', 'Facebook',    15000,  7500, 135000,     800, 'USD'],
      ['PNC_2025', 'SEA', 'StreamerF', 'Trovo',        8000,  4000,  72000,     400, 'USD'],
    ],
  ), 'Co-streaming')
  XLSX.utils.book_append_sheet(wb, makeEventIdSheet(), '유효 event_id 목록')
  XLSX.utils.book_append_sheet(wb, makePlatformSheet(), '유효 플랫폼 목록')
  return toBytes(wb)
}

export function generateUploadTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new()

  // ── 이벤트 ──────────────────────────────────────────────────
  // 필수: 이벤트명, 연도 / 선택: 시작일, 종료일, 장소, 상태
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '연도', '시작일(선택)', '종료일(선택)', '장소(선택)', '상태(선택)'],
    [
      ['PNC 2025', 2025, '2025-07-31', '2025-08-03', 'Seoul, Korea', 'completed'],
      ['PGC 2025', 2025, '2025-11-14', '2025-11-23', 'TBD', 'upcoming'],
    ],
  ), '이벤트')

  // ── 뷰어십 ──────────────────────────────────────────────────
  // 필수: 이벤트명 / 선택: 나머지 전부 (있는 것만 입력)
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', 'Peak CCV', 'Unique Viewers', 'Hours Watched', 'ACV(선택)'],
    [
      ['PNC 2025', 423000, 1840000, 3712000, 187000],
      ['PGC 2025', '', '', '', ''],
    ],
  ), '뷰어십')

  // ── 소셜 (선택) ─────────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '플랫폼', '노출(Impressions)', '반응(Engagements)', '영상 뷰', '팔로워 증감'],
    [['PNC 2025', 'instagram', 2800000, 215000, 740000, 18900]],
  ), '소셜(선택)')

  return toBytes(wb)
}
