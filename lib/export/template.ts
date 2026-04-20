import * as XLSX from 'xlsx'
import { EVENT_MASTER } from '@/lib/config/event-master'

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

/** template_viewership.xlsx */
export function generateViewershipTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new()
  // Platform: 비워두면 Type A (통합), 입력하면 Type B (플랫폼 분리)
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['event_id', 'Platform (Optional)', 'PCCV', 'ACCV', 'Unique Viewers', 'Stability Ratio'],
    [
      // Type A 예시 — Platform 비워두기
      ['PNC_2025',  '',        850000, 420000, 2100000, '자동계산'],
      // Type B 예시 — Platform 별도 입력
      ['PGC_2025',  'Twitch',  500000, 240000, 1200000, '자동계산'],
      ['PGC_2025',  'YouTube', 280000, 140000,  700000, '자동계산'],
      ['PGC_2025',  'Afreeca',  70000,  40000,  200000, '자동계산'],
    ],
  ), 'Viewership')
  XLSX.utils.book_append_sheet(wb, makeEventIdSheet(), '유효 event_id 목록')
  return toBytes(wb)
}

/** template_contents.xlsx */
export function generateContentsTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['event_id', 'Date', 'Platform', 'Region / Language', 'Content Type 1', 'Content Type 2',
     'Number of Contents', 'Impression', 'Views', 'Likes', 'Comments'],
    [
      ['PNC_2025', '2025-06-20', 'Instagram', 'KR', '숏폼',  '하이라이트', 12,  2800000, 740000,  45000, 3200],
      ['PNC_2025', '2025-06-21', 'YouTube',   'EN', '롱폼',  '하이라이트', 5,   1200000, 980000,  22000, 1800],
      ['PNC_2025', '2025-06-21', 'TikTok',    'KR', '숏폼',  '프로모션',   20,  4500000, 3200000, 88000, 5500],
      ['PNC_2025', '2025-06-22', 'X',         'EN', '포스트', '하이핑',     30,   980000,       0, 12000,  900],
    ],
  ), 'Contents')
  XLSX.utils.book_append_sheet(wb, makeEventIdSheet(), '유효 event_id 목록')
  return toBytes(wb)
}

/** template_costreaming.xlsx */
export function generateCostreamingTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['event_id', 'Region / Language', 'Streamer Name', 'Platform', 'PCCV', 'ACCV', 'Cost', 'Currency'],
    [
      ['PNC_2025', 'KR', 'StreamerA', 'SoopTV',  85000, 42000, 3000000, 'KRW'],
      ['PNC_2025', 'KR', 'StreamerB', 'Chzzk',   62000, 31000, 2500000, 'KRW'],
      ['PNC_2025', 'EN', 'StreamerC', 'Twitch',  45000, 22000,    2000, 'USD'],
      ['PNC_2025', 'JP', 'StreamerD', 'YouTube', 28000, 14000,  150000, 'JPY'],
    ],
  ), 'Co-streaming')
  XLSX.utils.book_append_sheet(wb, makeEventIdSheet(), '유효 event_id 목록')
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
