/**
 * 탭별 템플릿 파서 — /data-upload 전용
 * v7: Year + Event 컬럼 제거 → event_id 단일 컬럼 사용
 *     업로드 시 event_id 를 EVENT_MASTER 에서 검증 (최우선 검사)
 */
import * as XLSX from 'xlsx'
import type { Event, ViewershipKpi, SocialKpi, CostreamingKpi } from '@/types'
import { guessEventType } from '@/lib/config/constants'
import {
  EVENT_MASTER,
  getEventMasterById,
  validateEventId,
  normalizeEventId,
  type EventMasterEntry,
} from '@/lib/config/event-master'
import { normalizeViewershipPlatform, normalizeSocialPlatform, normalizePlatform, PLATFORMS } from '@/lib/config/constants'

// ── 유틸 ────────────────────────────────────────────────────────

function str(v: unknown) { return String(v ?? '').trim() }
function num(v: unknown): number | undefined { const n = Number(v); return isNaN(n) || n === 0 ? undefined : n }
function numOrZero(v: unknown): number { return Number(v) || 0 }

/** 필수 컬럼 존재 여부 검사. 누락 시 오류 메시지 반환 */
function checkRequiredColumns(row: Record<string, unknown>, required: string[]): string | null {
  const missing = required.filter(col => !(col in row))
  return missing.length ? `필수 컬럼 누락: ${missing.join(', ')}` : null
}

/**
 * event_id 문자열 → Event 객체 변환 (EVENT_MASTER 기반)
 * 반환된 Event.id / Event.name 은 모두 event_id 값 (예: "PNC_2025")
 * Supabase 저장 시 saveTypedKpisToSupabase 내에서 UUID 로 재매핑됨
 */
function masterToEvent(entry: EventMasterEntry): Event {
  const nowYear = new Date().getFullYear()
  return {
    id:         entry.event_id,
    name:       entry.event_id,
    type:       guessEventType(entry.event_id),
    year:       entry.year,
    start_date: `${entry.year}-01-01`,
    end_date:   `${entry.year}-12-31`,
    status:     entry.year < nowYear ? 'completed'
              : entry.year === nowYear ? 'live'
              : 'upcoming',
  }
}

/** 파싱된 rows 에서 event_id 를 전수 검증 — 유효하지 않은 값 발견 시 오류 목록 반환 */
function preValidateEventIds(rows: Record<string, unknown>[]): { row: number; message: string }[] {
  const errors: { row: number; message: string }[] = []
  const seen = new Set<string>()
  rows.forEach((raw, i) => {
    const eid = normalizeEventId(str(raw['event_id']))
    if (!eid) return  // 빈 행은 각 파서에서 처리
    if (seen.has(eid)) return  // 이미 검증된 ID는 스킵
    seen.add(eid)
    const err = validateEventId(eid)
    if (err) errors.push({ row: i + 2, message: err })
  })
  return errors
}

export interface TypedParseResult {
  events:       Event[]
  viewership?:  ViewershipKpi[]
  social?:      SocialKpi[]
  costreaming?: CostreamingKpi[]
  errors:       { row: number; message: string }[]
  rowCount:     number
}

// ── Viewership 파서 ─────────────────────────────────────────────
// 컬럼: event_id | Platform (Optional) | PCCV | ACCV | Unique Viewers | Stability Ratio(무시)
// Platform 비어있음 → Type A (통합, platform='total')
// Platform 값 있음  → Type B (플랫폼별)

export function parseViewershipFile(buffer: ArrayBuffer): TypedParseResult {
  const wb   = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const events: Event[]             = []
  const viewership: ViewershipKpi[] = []
  const errors: { row: number; message: string }[] = []

  if (rows.length === 0) return { events, errors, rowCount: 0 }

  // 필수 컬럼 검증
  const colErr = checkRequiredColumns(rows[0], ['event_id'])
  if (colErr) return { events, errors: [{ row: 1, message: colErr }], rowCount: 0 }

  // event_id 전수 검증 (최우선)
  const idErrors = preValidateEventIds(rows)
  if (idErrors.length) return { events, errors: idErrors, rowCount: 0 }

  rows.forEach((raw, i) => {
    const rowNum   = i + 2
    const eventId  = normalizeEventId(str(raw['event_id']))
    if (!eventId) return  // 빈 행 스킵

    const master = getEventMasterById(eventId)!  // preValidate 통과했으므로 반드시 존재

    // 이벤트 객체 등록
    if (!events.find(e => e.id === master.event_id)) {
      events.push(masterToEvent(master))
    }

    // Platform (Optional) 컬럼명 유연 인식
    const plRaw = str(raw['Platform (Optional)'] ?? raw['Platform'])

    // 플랫폼 결정 — 빈 값·'-' → Type A (total), 값 있음 → Type B
    let platform: ViewershipKpi['platform']
    if (!plRaw || plRaw === '-') {
      platform = 'total'
    } else if (plRaw.toLowerCase() === 'total') {
      platform = 'total'
    } else {
      const p = normalizeViewershipPlatform(plRaw)
      if (!p) {
        errors.push({ row: rowNum, message: `알 수 없는 플랫폼: "${plRaw}" (${Object.values(PLATFORMS).join(' / ')} 중 하나)` })
        return
      }
      platform = p
    }

    const peakCcv       = num(raw['PCCV'])
    const accv          = num(raw['ACCV'])
    const uniqueViewers = num(raw['Unique Viewers'])
    const hoursWatched  = num(raw['Hours Watched'] ?? raw['hours_watched'])
    // Stability Ratio 무시 — 시스템이 ACCV ÷ PCCV 자동 계산

    // Official 컬럼: 'Y'/'Yes'/'TRUE'/'1' → true, 그 외 → false, 없으면 undefined
    const officialRaw = str(raw['Official'] ?? raw['official'] ?? raw['Is Official'] ?? '')
    const is_official = officialRaw
      ? ['y', 'yes', 'true', '1', 'official'].includes(officialRaw.toLowerCase())
      : undefined

    if (!peakCcv && !accv && !uniqueViewers && !hoursWatched) return  // 빈 데이터 행 스킵

    viewership.push({
      id:             crypto.randomUUID(),
      event_id:       master.event_id,
      platform,
      peak_ccv:       peakCcv,
      acv:            accv,
      unique_viewers: uniqueViewers,
      hours_watched:  hoursWatched,
      is_official:    is_official,
      recorded_at:    new Date(master.year, 11, 31).toISOString(),
    })
  })

  return { events, viewership, errors, rowCount: viewership.length }
}

// ── Contents 파서 ───────────────────────────────────────────────
// 컬럼: event_id | Date (Optional) | Platform | Region / Language | Content Type 1 | Content Type 2
//        | Number of Contents | Impression | Views | Likes | Comments
// Date 있음 → 날짜별 트래킹 (월간/주간 집계 가능)
// Date 없음 → 대회 연도 말일로 기본값 설정

export function parseContentsFile(buffer: ArrayBuffer): TypedParseResult {
  const wb   = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const events: Event[]     = []
  const social: SocialKpi[] = []
  const errors: { row: number; message: string }[] = []

  if (rows.length === 0) return { events, errors, rowCount: 0 }

  const colErr = checkRequiredColumns(rows[0], ['event_id', 'Platform'])
  if (colErr) return { events, errors: [{ row: 1, message: colErr }], rowCount: 0 }

  const idErrors = preValidateEventIds(rows)
  if (idErrors.length) return { events, errors: idErrors, rowCount: 0 }

  rows.forEach((raw, i) => {
    const rowNum  = i + 2
    const eventId = normalizeEventId(str(raw['event_id']))
    const plRaw   = str(raw['Platform'])

    if (!eventId || !plRaw) {
      if (eventId || plRaw) errors.push({ row: rowNum, message: 'event_id / Platform 누락' })
      return
    }

    const platform = normalizeSocialPlatform(plRaw)
    if (!platform) {
      errors.push({ row: rowNum, message: `인식 불가 플랫폼: ${plRaw}` })
      return
    }

    const master = getEventMasterById(eventId)!
    if (!events.find(e => e.id === master.event_id)) {
      events.push(masterToEvent(master))
    }

    // Date 컬럼 파싱 — 값 있으면 해당 날짜, 없으면 대회 연도 말일
    const dateRaw = str(raw['Date'] ?? raw['date'] ?? raw['날짜'] ?? '')
    let recordedAt = new Date(master.year, 11, 31).toISOString()
    if (dateRaw) {
      const parsed = new Date(dateRaw)
      if (!isNaN(parsed.getTime())) recordedAt = parsed.toISOString()
    }

    const engagementsDirect = numOrZero(raw['Engagements'] ?? raw['Engagement'] ?? raw['반응(Engagements)'])
    const engagementsFromSplit = numOrZero(raw['Likes']) + numOrZero(raw['Comments'])

    social.push({
      id:             crypto.randomUUID(),
      event_id:       master.event_id,
      platform,
      impressions:    numOrZero(raw['Impression'] ?? raw['Impressions'] ?? raw['노출(Impressions)']),
      engagements:    engagementsDirect || engagementsFromSplit,
      video_views:    numOrZero(raw['Views'] ?? raw['Video Views'] ?? raw['영상 뷰']),
      follower_delta: numOrZero(raw['Follower Delta'] ?? raw['Follower Change'] ?? raw['팔로워 증감']),
      content_count:  numOrZero(raw['Number of Contents'] ?? raw['Content Count'] ?? raw['Contents']),
      region:         str(raw['Region / Language'] ?? raw['Region/Language']) || undefined,
      content_type_1: str(raw['Content Type 1']) || undefined,
      content_type_2: str(raw['Content Type 2']) || undefined,
      recorded_at:    recordedAt,
    })
  })

  return { events, social, errors, rowCount: social.length }
}

// ── Co-streaming 파서 ───────────────────────────────────────────
// 컬럼: event_id | Region/Language | Streamer Name | Platform | PCCV | ACCV | Cost | Currency
// 집계: 동일 event_id + Region → BroadcastKpi 1개로 그룹화

export function parseCostreamingFile(buffer: ArrayBuffer): TypedParseResult {
  const wb   = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const events: Event[] = []
  const errors: { row: number; message: string }[] = []

  if (rows.length === 0) return { events, errors, rowCount: 0 }

  const colErr = checkRequiredColumns(rows[0], ['event_id'])
  if (colErr) return { events, errors: [{ row: 1, message: colErr }], rowCount: 0 }

  const idErrors = preValidateEventIds(rows)
  if (idErrors.length) return { events, errors: idErrors, rowCount: 0 }

  type Agg = {
    master: EventMasterEntry
    region: string
    platform: string
    streamer_count: number
    peak_view_sum: number
    accv_sum: number
    hours_watched_sum: number
    cost_usd: number
  }
  const agg = new Map<string, Agg>()

  rows.forEach((raw, i) => {
    const eventId = normalizeEventId(str(raw['event_id']))
    if (!eventId) return

    const master = getEventMasterById(eventId)!
    if (!events.find(e => e.id === master.event_id)) {
      events.push(masterToEvent(master))
    }

    const region      = str(raw['Region / Language'] ?? raw['Region/Language'])
    const platformRaw = str(raw['Platform'] ?? raw['platform'])
    const platform    = (platformRaw ? (normalizePlatform(platformRaw) ?? platformRaw) : '')
    const key         = `${master.event_id}::${region}::${platform}`
    const cur         = agg.get(key) ?? {
      master, region, platform,
      streamer_count: 0, peak_view_sum: 0,
      accv_sum: 0, hours_watched_sum: 0, cost_usd: 0,
    }

    const peakView     = numOrZero(raw['PCCV'])
    const accv         = numOrZero(raw['ACCV'])
    const hoursWatched = numOrZero(raw['Hours Watched'] ?? raw['hours_watched'])
    const cost         = numOrZero(raw['Cost'])
    const currency     = str(raw['Currency']).toUpperCase()
    const costUsd      = currency === 'KRW' ? cost / 1300 : currency === 'JPY' ? cost / 155 : cost

    cur.streamer_count++
    cur.peak_view_sum     += peakView
    cur.accv_sum          += accv
    cur.hours_watched_sum += hoursWatched
    cur.cost_usd          += costUsd

    agg.set(key, cur)
  })

  const costreaming: CostreamingKpi[] = Array.from(agg.values()).map(a => ({
    id:                  crypto.randomUUID(),
    event_id:            a.master.event_id,
    platform:            a.platform || undefined,
    co_streamer_count:   a.streamer_count,
    co_streamer_viewers: a.peak_view_sum,
    acv:                 a.accv_sum > 0 ? Math.round(a.accv_sum) : undefined,
    hours_watched:       a.hours_watched_sum > 0 ? Math.round(a.hours_watched_sum) : undefined,
    cost_usd:            Math.round(a.cost_usd),
    region:              a.region || undefined,
    recorded_at:         new Date().toISOString(),
  }))

  return { events, costreaming, errors, rowCount: costreaming.length }
}

// ── 병합 헬퍼 (localStorage 로컬 상태용) ───────────────────────
// Supabase 저장 성공 시 loadFromSupabase() 로 대체되므로 로컬 프리뷰용

export type MergeType = 'viewership' | 'contents' | 'costreaming'
