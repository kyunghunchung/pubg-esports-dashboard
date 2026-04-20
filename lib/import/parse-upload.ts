import * as XLSX from 'xlsx'
import type { Event, ViewershipKpi, SocialKpi } from '@/types'
import type { DashboardData } from '@/lib/store'
import { guessEventType, normalizeSocialPlatform } from '@/lib/config/constants'

export type ParsedSheet = 'viewership' | 'social' | 'costreaming'

export interface ParseError { sheet: string; row: number; message: string }

export interface ParseResult {
  data:    DashboardData
  errors:  ParseError[]
  summary: Record<ParsedSheet | 'events', number>
  format?: 'template' | 'legacy'
}


// ── 유틸 ────────────────────────────────────────────────────

function makeEventId(name: string, year: number | string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + year
}

function toDate(val: unknown): string {
  if (!val) return new Date().toISOString()
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    return new Date(d.y, d.m - 1, d.d).toISOString()
  }
  return new Date(String(val)).toISOString()
}

function str(val: unknown) { return String(val ?? '').trim() }
function num(val: unknown) { return Number(val) || undefined }

// ─────────────────────────────────────────────────────────────
// 레거시 파서 — '글로벌 대회' / '지역 대회' 시트 형식
// ─────────────────────────────────────────────────────────────
function parseLegacyFile(wb: XLSX.WorkBook): ParseResult {
  const events: Event[]          = []
  const viewership: ViewershipKpi[] = []
  const errors: ParseError[]     = []
  const summary = { events:0, viewership:0, social:0, costreaming:0 }
  const nowYear = new Date().getFullYear()

  function upsertEvent(name: string, year: number, region?: string) {
    const id = makeEventId(name, year)
    if (!events.find(e => e.id === id)) {
      events.push({ id, name, type: guessEventType(name), year,
        start_date: `${year}-01-01`, end_date: `${year}-12-31`, region,
        status: year < nowYear ? 'completed' : year === nowYear ? 'live' : 'upcoming' })
      summary.events++
    }
    return id
  }

  const globalWs = wb.Sheets['글로벌 대회']
  if (globalWs) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(globalWs, { header: 1, defval: '' }) as unknown[][]
    rows.forEach((row, i) => {
      if (i === 0) return
      const year = typeof row[0] === 'number' ? row[0] : 0
      const name = str(row[1])
      if (!year || !name || name.includes('──')) return
      const pcv = typeof row[2] === 'number' ? row[2] : undefined
      const acv = typeof row[3] === 'number' ? row[3] : undefined
      if (!pcv && !acv) return
      try {
        const event_id = upsertEvent(name, year)
        viewership.push({ id: crypto.randomUUID(), event_id, platform: 'total',
          peak_ccv: pcv, acv, recorded_at: new Date(year, 11, 31).toISOString() })
        summary.viewership++
      } catch (e) { errors.push({ sheet: '글로벌 대회', row: i+1, message: String(e) }) }
    })
  }

  const localWs = wb.Sheets['지역 대회']
  if (localWs) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(localWs, { header: 1, defval: '' }) as unknown[][]
    rows.forEach((row, i) => {
      if (i === 0) return
      const year = typeof row[0] === 'number' ? row[0] : 0
      const name = str(row[1])
      if (!year || !name || name.includes('──')) return
      const region = str(row[2]) || undefined
      const pcv = typeof row[3] === 'number' ? row[3] : undefined
      if (!pcv) return
      try {
        const event_id = upsertEvent(name, year, region)
        if (!viewership.find(v => v.event_id === event_id)) {
          viewership.push({ id: crypto.randomUUID(), event_id, platform: 'total',
            peak_ccv: pcv, recorded_at: new Date(year, 11, 31).toISOString() })
          summary.viewership++
        }
      } catch (e) { errors.push({ sheet: '지역 대회', row: i+1, message: String(e) }) }
    })
  }

  return {
    data: { events, viewership, social:[], costreaming:[], uploadedAt: new Date().toISOString() },
    errors, summary, format: 'legacy',
  }
}

// ─────────────────────────────────────────────────────────────
// 템플릿 파서
// ─────────────────────────────────────────────────────────────
function parseTemplateFile(wb: XLSX.WorkBook): ParseResult {
  const errors: ParseError[] = []
  const summary = { events:0, viewership:0, social:0, costreaming:0 }
  const nowYear = new Date().getFullYear()
  const events: Event[] = []

  // ── 이벤트 시트 ────────────────────────────────────────────
  const evWs = wb.Sheets['이벤트']
  if (evWs) {
    XLSX.utils.sheet_to_json<Record<string, unknown>>(evWs, { defval: '' }).forEach((raw, i) => {
      const name = str(raw['이벤트명'])
      if (!name) return
      const year = Number(raw['연도']) || nowYear
      events.push({
        id:         makeEventId(name, year),
        name,
        type:       (str(raw['유형'] ?? raw['type'] ?? '') || guessEventType(name)) as Event['type'],
        year,
        start_date: str(raw['시작일'] ?? raw['시작일(선택)']) || `${year}-01-01`,
        end_date:   str(raw['종료일'] ?? raw['종료일(선택)']) || `${year}-12-31`,
        venue:      str(raw['장소']  ?? raw['장소(선택)'])   || undefined,
        region:     str(raw['지역'])  || undefined,
        status:     (str(raw['상태'] ?? raw['상태(선택)']) || (year < nowYear ? 'completed' : 'upcoming')) as Event['status'],
      })
      summary.events++
    })
  }

  // 이벤트명으로 ID 찾기 — 없으면 자동 생성
  function resolveEvent(name: string): string | null {
    if (!name) return null
    const found = events.find(e => e.name.toLowerCase() === name.toLowerCase())
    if (found) return found.id
    // 자동 생성
    const yearMatch = name.match(/\b(20\d{2})\b/)
    const year = yearMatch ? parseInt(yearMatch[1]) : nowYear
    const id = makeEventId(name, year)
    events.push({
      id, name, type: guessEventType(name) as Event['type'], year,
      start_date: `${year}-01-01`, end_date: `${year}-12-31`,
      status: year < nowYear ? 'completed' : year === nowYear ? 'live' : 'upcoming',
    })
    summary.events++
    return id
  }

  // ── 뷰어십 ─────────────────────────────────────────────────
  const viewership: ViewershipKpi[] = []
  const vWs = wb.Sheets['뷰어십']
  if (vWs) {
    XLSX.utils.sheet_to_json<Record<string, unknown>>(vWs, { defval: '' }).forEach((raw, i) => {
      const name = str(raw['이벤트명'])
      const event_id = resolveEvent(name)
      if (!event_id) return  // 이벤트명 빈칸 → 스킵

      // 플랫폼: '플랫폼', '플랫폼(선택)' 중 하나, 없으면 total
      const platformRaw = str(raw['플랫폼(선택)'] ?? raw['플랫폼'])
      const platform = platformRaw || 'total'

      const peakCcv       = num(raw['Peak CCV'])
      const uniqueViewers = num(raw['Unique Viewers'] ?? raw['순 시청자 수'])
      const hoursWatched  = num(raw['Hours Watched'])
      const acv           = num(raw['ACV'] ?? raw['ACV(선택)'])

      // 숫자 데이터가 하나도 없으면 스킵
      if (!peakCcv && !uniqueViewers && !hoursWatched && !acv) return

      viewership.push({
        id: crypto.randomUUID(), event_id,
        platform: platform as ViewershipKpi['platform'],
        peak_ccv: peakCcv, unique_viewers: uniqueViewers,
        hours_watched: hoursWatched, acv,
        recorded_at: toDate(raw['기록일'] ?? raw['기록일(YYYY-MM-DD)']),
      })
      summary.viewership++
    })
  }

  // ── 소셜 (선택) ─────────────────────────────────────────────
  const social: SocialKpi[] = []
  const sWs = wb.Sheets['소셜'] ?? wb.Sheets['소셜(선택)']
  if (sWs) {
    XLSX.utils.sheet_to_json<Record<string, unknown>>(sWs, { defval: '' }).forEach((raw, i) => {
      const name = str(raw['이벤트명'])
      const event_id = resolveEvent(name)
      if (!event_id) return

      const platformRaw = str(raw['플랫폼'])
      if (!platformRaw) return
      const platform = normalizeSocialPlatform(platformRaw)
      if (!platform) return  // 인식 불가 플랫폼 → 조용히 스킵

      const impressions = Number(raw['노출(Impressions)']) || 0
      const engagements = Number(raw['반응(Engagements)']) || 0
      if (!impressions && !engagements) return

      social.push({
        id: crypto.randomUUID(), event_id,
        platform: platform as SocialKpi['platform'],
        impressions, engagements,
        video_views:    Number(raw['영상 뷰'])    || 0,
        follower_delta: Number(raw['팔로워 증감']) || 0,
        recorded_at: toDate(raw['기록일'] ?? raw['기록일(YYYY-MM-DD)']),
      })
      summary.social++
    })
  }

  return {
    data: { events, viewership, social, costreaming:[], uploadedAt: new Date().toISOString() },
    errors, summary, format: 'template',
  }
}

// ─────────────────────────────────────────────────────────────
// 진입점
// ─────────────────────────────────────────────────────────────
export function parseUploadFile(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: 'array' })
  const isLegacy = wb.SheetNames.includes('글로벌 대회') || wb.SheetNames.includes('지역 대회')
  if (isLegacy) return parseLegacyFile(wb)
  return parseTemplateFile(wb)
}
