import * as XLSX from 'xlsx'
import { MIN_YEAR } from '@/lib/config/constants'

function makeSheet(headers: string[], rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map(() => ({ wch: 22 }))
  return ws
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

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Uint8Array(buf)
}
