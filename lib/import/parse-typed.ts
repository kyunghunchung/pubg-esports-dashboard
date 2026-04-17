/**
 * 탭별 템플릿 파서 — /data-upload 전용
 * Viewership / Contents / Co-streaming 각각 분리 파싱 후
 * 기존 DashboardData에 안전하게 병합합니다.
 */
import * as XLSX from 'xlsx'
import type { Event, ViewershipKpi, SocialKpi, BroadcastKpi } from '@/types'
import type { DashboardData } from '@/lib/store'
import { guessEventType, normalizeViewershipPlatform, normalizeSocialPlatform } from '@/lib/config/constants'

// ── 유틸 ────────────────────────────────────────────────────────

function str(v: unknown) { return String(v ?? '').trim() }
function num(v: unknown): number | undefined { const n = Number(v); return isNaN(n) || n === 0 ? undefined : n }
function numOrZero(v: unknown): number { return Number(v) || 0 }

/** Excel 날짜 시리얼 넘버 또는 문자열을 ISO 날짜 문자열로 변환 */
function toISODate(val: unknown, fallbackYear?: number): string {
  if (!val) return fallbackYear ? new Date(fallbackYear, 11, 31).toISOString() : new Date().toISOString()
  // Excel 시리얼 넘버 (숫자형 날짜)
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    return new Date(d.y, d.m - 1, d.d).toISOString()
  }
  // Date 객체 (cellDates: true 시)
  if (val instanceof Date) return val.toISOString()
  // 문자열 파싱
  const parsed = new Date(String(val).trim())
  return isNaN(parsed.getTime())
    ? (fallbackYear ? new Date(fallbackYear, 11, 31).toISOString() : new Date().toISOString())
    : parsed.toISOString()
}

/** 필수 컬럼 존재 여부 검사. 누락 시 오류 메시지 반환 */
function checkRequiredColumns(row: Record<string, unknown>, required: string[]): string | null {
  const missing = required.filter(col => !(col in row))
  return missing.length ? `필수 컬럼 누락: ${missing.join(', ')}` : null
}

function makeEventId(name: string, year: number | string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + year
}

function resolveOrCreateEvent(
  name: string,
  year: number,
  existing: Event[],
): Event {
  const id = makeEventId(name, year)
  const found = existing.find(e => e.id === id)
  if (found) return found
  const nowYear = new Date().getFullYear()
  return {
    id, name, type: guessEventType(name), year,
    start_date: `${year}-01-01`,
    end_date:   `${year}-12-31`,
    status: year < nowYear ? 'completed' : year === nowYear ? 'live' : 'upcoming',
  }
}

export interface TypedParseResult {
  events:      Event[]
  viewership?: ViewershipKpi[]
  social?:     SocialKpi[]
  broadcast?:  BroadcastKpi[]
  errors:      { row: number; message: string }[]
  rowCount:    number
}

// ── Viewership 파서 ─────────────────────────────────────────────
// 컬럼: Year | Event | Platform | Date | PCCV | ACCV | Unique Viewers | Stability Ratio(무시)

export function parseViewershipFile(buffer: ArrayBuffer): TypedParseResult {
  const wb   = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const events: Event[]             = []
  const viewership: ViewershipKpi[] = []
  const errors: { row: number; message: string }[] = []

  // 첫 행으로 필수 컬럼 검증
  if (rows.length > 0) {
    const colError = checkRequiredColumns(rows[0], ['Year', 'Event', 'Platform'])
    if (colError) return { events, errors: [{ row: 1, message: colError }], rowCount: 0 }
  }

  rows.forEach((raw, i) => {
    const rowNum = i + 2
    const year   = Number(raw['Year'])
    const name   = str(raw['Event'])
    const plRaw  = str(raw['Platform'])

    if (!year || !name) {
      if (year || name) errors.push({ row: rowNum, message: 'Year 또는 Event 누락' })
      return
    }

    // 플랫폼 정규화 — 알 수 없는 플랫폼도 소문자로 허용 (경고만)
    const normalizedPlatform = plRaw.toLowerCase() === 'total'
      ? 'total'
      : normalizeViewershipPlatform(plRaw)
    if (!normalizedPlatform) {
      errors.push({ row: rowNum, message: `알 수 없는 플랫폼: "${plRaw}" (twitch/youtube/sooptv/chzzk/kick/nimotv/afreeca/total 중 하나)` })
      return
    }

    const peakCcv       = num(raw['PCCV'])
    const accv          = num(raw['ACCV'])
    const uniqueViewers = num(raw['Unique Viewers'])
    // Stability Ratio 컬럼 무시 — 시스템이 ACCV ÷ PCCV 로 자동 계산

    if (!peakCcv && !accv && !uniqueViewers) return  // 빈 행 스킵

    const event = resolveOrCreateEvent(name, year, events)
    if (!events.find(e => e.id === event.id)) events.push(event)

    viewership.push({
      id:             crypto.randomUUID(),
      event_id:       event.id,
      platform:       normalizedPlatform as ViewershipKpi['platform'],
      peak_ccv:       peakCcv,
      acv:            accv,
      unique_viewers: uniqueViewers,
      recorded_at:    toISODate(raw['Date'], year),
    })
  })

  return { events, viewership, errors, rowCount: viewership.length }
}

// ── Contents 파서 ───────────────────────────────────────────────
// 컬럼: Year | Event | Platform | Region/Language | Content Type 1 | Content Type 2
//        | Number of Contents | Impression | Views | Likes | Comments | Published Date

export function parseContentsFile(buffer: ArrayBuffer): TypedParseResult {
  const wb   = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const events: Event[]  = []
  const social: SocialKpi[] = []
  const errors: { row: number; message: string }[] = []

  rows.forEach((raw, i) => {
    const rowNum = i + 2
    const year  = Number(raw['Year'])
    const name  = str(raw['Event'])
    const plRaw = str(raw['Platform'])

    if (!year || !name || !plRaw) {
      if (year || name) errors.push({ row: rowNum, message: 'Year / Event / Platform 누락' })
      return
    }

    const platform = normalizeSocialPlatform(plRaw)
    if (!platform) {
      errors.push({ row: rowNum, message: `인식 불가 플랫폼: ${plRaw}` })
      return
    }

    const event = resolveOrCreateEvent(name, year, events)
    if (!events.find(e => e.id === event.id)) events.push(event)

    const impressions = numOrZero(raw['Impression'] ?? raw['Impressions'])
    const views       = numOrZero(raw['Views'])
    const likes       = numOrZero(raw['Likes'])
    const comments    = numOrZero(raw['Comments'])
    const dateRaw     = raw['Published Date']

    social.push({
      id: crypto.randomUUID(),
      event_id: event.id,
      platform,
      impressions,
      engagements: likes + comments,
      video_views: views,
      follower_delta: 0,
      content_count:  numOrZero(raw['Number of Contents']),
      region:         str(raw['Region / Language'] ?? raw['Region/Language']) || undefined,
      content_type_1: str(raw['Content Type 1']) || undefined,
      content_type_2: str(raw['Content Type 2']) || undefined,
      recorded_at: toISODate(dateRaw),
    })
  })

  return { events, social, errors, rowCount: social.length }
}

// ── Co-streaming 파서 ───────────────────────────────────────────
// 컬럼: Year | Event | Region/Language | Streamer Name | Platform
//        | Peak View | ACCV | Cost | Currency
// 집계: 동일 Event + Region → BroadcastKpi 1개로 그룹화

export function parseCostreamingFile(buffer: ArrayBuffer): TypedParseResult {
  const wb   = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const events: Event[] = []
  const errors: { row: number; message: string }[] = []

  // 그룹: eventId_region → 집계 누적
  type Agg = {
    event: Event
    region: string
    streamer_count: number
    peak_view_sum: number
    accv_sum: number
    accv_count: number
    cost_usd: number
  }
  const agg = new Map<string, Agg>()

  rows.forEach((raw, i) => {
    const rowNum = i + 2
    const year  = Number(raw['Year'])
    const name  = str(raw['Event'])
    const region = str(raw['Region / Language'] ?? raw['Region/Language'])

    if (!year || !name) {
      if (year || name) errors.push({ row: rowNum, message: 'Year 또는 Event 누락' })
      return
    }

    const event = resolveOrCreateEvent(name, year, events)
    if (!events.find(e => e.id === event.id)) events.push(event)

    const key  = `${event.id}::${region}`
    const cur  = agg.get(key) ?? { event, region, streamer_count: 0, peak_view_sum: 0, accv_sum: 0, accv_count: 0, cost_usd: 0 }

    const peakView = numOrZero(raw['PCCV'])
    const accv     = numOrZero(raw['ACCV'])
    const cost     = numOrZero(raw['Cost'])
    const currency = str(raw['Currency']).toUpperCase()

    // 비용을 USD로 단순 변환 (정확도보다 입력 보존 우선 — 추후 환율 처리 예정)
    const costUsd = currency === 'KRW' ? cost / 1300 : currency === 'JPY' ? cost / 155 : cost

    cur.streamer_count++
    cur.peak_view_sum += peakView
    if (accv > 0) { cur.accv_sum += accv; cur.accv_count++ }
    cur.cost_usd += costUsd

    agg.set(key, cur)
  })

  const broadcast: BroadcastKpi[] = Array.from(agg.values()).map(a => ({
    id: crypto.randomUUID(),
    event_id: a.event.id,
    co_streamer_count:   a.streamer_count,
    co_streamer_viewers: a.peak_view_sum,
    acv: a.accv_count > 0 ? Math.round(a.accv_sum / a.accv_count) : undefined,
    cost_usd: Math.round(a.cost_usd),
    region: a.region || undefined,
    recorded_at: new Date().toISOString(),
  }))

  return { events, broadcast, errors, rowCount: broadcast.length }
}

// ── 병합 헬퍼 ───────────────────────────────────────────────────
// 업로드 성공 시: 해당 타입의 기존 데이터를 새 데이터로 교체 (이벤트는 추가만)
// 업로드 실패 시: 이 함수를 호출하지 않아 기존 데이터 보존

export type MergeType = 'viewership' | 'contents' | 'costreaming'

export function mergeTypedUpload(
  existing: DashboardData,
  result: TypedParseResult,
  type: MergeType,
): DashboardData {
  // 이벤트 병합 — name+year 기준 중복 체크
  // 기존 이벤트(UUID)와 name+year가 같으면 기존 ID를 유지하고,
  // 새 이벤트의 슬러그 ID → 기존 UUID ID 매핑을 기록해 KPI에 적용한다.
  const mergedEvents = [...existing.events]
  const idRemap = new Map<string, string>() // 새 슬러그 ID → 실제 ID

  for (const ev of result.events) {
    const dup = mergedEvents.find(e => e.name === ev.name && e.year === ev.year)
    if (dup) {
      idRemap.set(ev.id, dup.id) // 새 슬러그 → 기존 UUID
    } else {
      mergedEvents.push(ev)
      idRemap.set(ev.id, ev.id) // 신규 이벤트는 그대로
    }
  }

  const remapId = (id: string) => idRemap.get(id) ?? id

  // 새 데이터로 교체될 이벤트의 실제 ID 집합 (기존 KPI 제거용)
  const replacedEventIds = new Set(idRemap.values())

  switch (type) {
    case 'viewership':
      return {
        ...existing,
        events: mergedEvents,
        viewership: [
          ...existing.viewership.filter(v => !replacedEventIds.has(v.event_id)),
          ...(result.viewership ?? []).map(v => ({ ...v, event_id: remapId(v.event_id) })),
        ],
        uploadedAt: new Date().toISOString(),
      }
    case 'contents':
      return {
        ...existing,
        events: mergedEvents,
        social: [
          ...existing.social.filter(s => !replacedEventIds.has(s.event_id)),
          ...(result.social ?? []).map(s => ({ ...s, event_id: remapId(s.event_id) })),
        ],
        uploadedAt: new Date().toISOString(),
      }
    case 'costreaming':
      return {
        ...existing,
        events: mergedEvents,
        broadcast: [
          ...existing.broadcast.filter(b => !replacedEventIds.has(b.event_id)),
          ...(result.broadcast ?? []).map(b => ({ ...b, event_id: remapId(b.event_id) })),
        ],
        uploadedAt: new Date().toISOString(),
      }
  }
}
