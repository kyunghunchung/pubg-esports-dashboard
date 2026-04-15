import * as XLSX from 'xlsx'

const HEADER_STYLE = { font: { bold: true }, fill: { fgColor: { rgb: '1F2937' } } }

function makeSheet(headers: string[], example: (string | number)[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  ws['!cols'] = headers.map(() => ({ wch: 20 }))
  return ws
}

export function generateUploadTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new()

  // ── 이벤트 (먼저 입력) ─────────────────────────────────
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '유형', '연도', '시작일', '종료일', '장소', '지역', '상태'],
    ['PNC 2025', 'PNC', 2025, '2025-07-31', '2025-08-03', 'Seoul, Korea', 'Global', 'completed'],
  ), '이벤트')

  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['유형 값', '상태 값'],
    ['PNC / PGC / PGS / GOTF / EWC / ENC', 'upcoming / live / completed'],
  ), '이벤트_참고')

  // ── Viewership ─────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '플랫폼', 'Peak CCV', 'ACV', 'Hours Watched', '순 시청자 수', '방송 시간(h)', '기록일(YYYY-MM-DD)'],
    ['PNC 2025', 'total',  423000,     187000, 3712000,         1840000,        90,             '2025-06-29'],
  ), '뷰어십')

  // 플랫폼 참고 시트
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['플랫폼 값 (그대로 입력)'],
    ['twitch / youtube / afreeca / total']
  ), '뷰어십_플랫폼참고')

  // ── Social ─────────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '플랫폼', '노출(Impressions)', '반응(Engagements)', '영상 뷰', '팔로워 증감', '기록일(YYYY-MM-DD)'],
    ['PNC 2025', 'instagram', 2800000, 215000, 740000, 18900, '2025-06-29'],
  ), '소셜')

  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['플랫폼 값 (그대로 입력)'],
    ['x / instagram / facebook / tiktok / youtube']
  ), '소셜_플랫폼참고')

  // ── Broadcast ──────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '채널 수', '코스트리머 수', '코스트리머 시청자', '커버리지 국가 수', '클립 조회수', '기록일(YYYY-MM-DD)'],
    ['PNC 2025', 18,        42,              280000,              12,                  4200000,       '2025-06-29'],
  ), '방송')

  // ── Competitive ────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '팀 수', '선수 수', '참가 국가 수', '상금(USD)', '기록일(YYYY-MM-DD)'],
    ['PNC 2025', 16,      64,        16,              500000,      '2025-06-29'],
  ), '경쟁')

  // ── Live Event ─────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '총 관객 수', '티켓 판매율(0~1)', '평균 좌석 점유율(0~1)', '기록일(YYYY-MM-DD)'],
    ['PNC 2025', 7420,         0.928,               0.895,                   '2025-06-29'],
  ), '현장')

  // ── KPI 목표값 ─────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['이벤트명', '카테고리', '지표명(metric)', '목표값', '단위'],
    ['PNC 2025', 'viewership', 'peak_ccv', 500000, '명'],
  ), 'KPI목표값')

  XLSX.utils.book_append_sheet(wb, makeSheet(
    ['카테고리 값', '지표명 예시'],
    ['viewership → peak_ccv / hours_watched / unique_viewers / acv / hours_broadcast', ''],
  ), '목표값_참고')

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Uint8Array(buf)
}
