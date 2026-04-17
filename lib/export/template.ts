import * as XLSX from 'xlsx'
import { MIN_YEAR } from '@/lib/config/constants'

function makeSheet(headers: string[], rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map(() => ({ wch: 22 }))
  return ws
}

function toBytes(wb: XLSX.WorkBook): Uint8Array {
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)
}

/** template_viewership.xlsx */
export function generateViewershipTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['Year', 'Event', 'Platform', 'Date', 'PCCV', 'ACCV', 'Unique Viewers', 'Stability Ratio'],
    [
      [2025, 'PNC 2025', 'total',   '2025-08-03', 423000, 187000, 1840000, ''],
      [2025, 'PNC 2025', 'twitch',  '2025-08-03', 180000, 82000,  '',       ''],
      [2025, 'PNC 2025', 'youtube', '2025-08-03', 243000, 105000, '',       ''],
      [2025, 'PGC 2025', 'total',   '',            '',     '',     '',       ''],
    ],
  ), 'Viewership')
  return toBytes(wb)
}

/** template_contents.xlsx */
export function generateContentsTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['Year', 'Event', 'Platform', 'Region / Language', 'Content Type 1', 'Content Type 2',
     'Number of Contents', 'Impression', 'Views', 'Likes', 'Comments', 'Published Date'],
    [
      [2025, 'PNC 2025', 'instagram', 'KR', '숏폼',  '하이라이트', 12,  2800000, 740000,  45000, 3200, '2025-08-04'],
      [2025, 'PNC 2025', 'youtube',   'EN', '롱폼',  '하이라이트', 5,   1200000, 980000,  22000, 1800, '2025-08-04'],
      [2025, 'PNC 2025', 'tiktok',    'KR', '숏폼',  '프로모션',   20,  4500000, 3200000, 88000, 5500, '2025-08-04'],
      [2025, 'PNC 2025', 'x',         'EN', '포스트', '하이핑',     30,  980000,  0,       12000, 900,  '2025-08-04'],
    ],
  ), 'Contents')
  return toBytes(wb)
}

/** template_costreaming.xlsx */
export function generateCostreamingTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['Year', 'Event', 'Region / Language', 'Streamer Name', 'Platform', 'PCCV', 'ACCV', 'Cost', 'Currency'],
    [
      [2025, 'PNC 2025', 'KR', 'StreamerA', 'sooptv',  85000, 42000, 3000000, 'KRW'],
      [2025, 'PNC 2025', 'KR', 'StreamerB', 'chzzk',   62000, 31000, 2500000, 'KRW'],
      [2025, 'PNC 2025', 'EN', 'StreamerC', 'twitch',  45000, 22000, 2000,    'USD'],
      [2025, 'PNC 2025', 'JP', 'StreamerD', 'youtube', 28000, 14000, 150000,  'JPY'],
    ],
  ), 'Co-streaming')
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
