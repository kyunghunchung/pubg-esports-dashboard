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
// 컬럼: Year | Event | Platform | Date | Peak CCV | Unique Viewers | Hours Watched

export function parseViewershipFile(buffer: ArrayBuffer): TypedParseResult {
  const wb     = XLSX.read(buffer, { type: 'array' })
  const ws     = wb.Sheets[wb.SheetNames[0]]
  const rows   = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const events: Event[]           = []
  const viewership: ViewershipKpi[] = []
  const errors: { row: number; message: string }[] = []

  const REQUIRED = ['Year', 'Event', 'Platform']

  rows.forEach((raw, i) => {
    const rowNum = i + 2
    const year  = Number(raw['Year'])
    const name  = str(raw['Event'])
    const plRaw = str(raw['Platform'])

    if (!year || !name) {
      if (year || name) errors.push({ row: rowNum, message: 'Year 또는 Event 누락' })
      return
    }

    const platform = plRaw.toLowerCase() === 'total'
      ? 'total'
      : (normalizeViewershipPlatform(plRaw) ?? plRaw.toLowerCase())

    const peakCcv      = num(raw['Peak CCV'])
    const uniqueViewers = num(raw['Unique Viewers'])
    const hoursWatched  = num(raw['Hours Watched'])

    if (!peakCcv && !uniqueViewers && !hoursWatched) return  // 빈 행 스킵

    const event = resolveOrCreateEvent(name, year, events)
    if (!events.find(e => e.id === event.id)) events.push(event)

    const dateRaw = raw['Date']
    const recorded_at = dateRaw
      ? new Date(str(dateRaw)).toISOString()
      : new Date(year, 11, 31).toISOString()

    viewership.push({
      id: crypto.randomUUID(),
      event_id: event.id,
      platform: platform as ViewershipKpi['platform'],
      peak_ccv: peakCcv,
      unique_viewers: uniqueViewers,
      hours_watched: hoursWatched,
      recorded_at,
    })
  })

  return { events, viewership, errors, rowCount: viewership.length }
}

// ── Contents 파서 ───────────────────────────────────────────────
// 컬럼: Year | Event | Platform | Region/Language | Content Type 1 | Content Type 2
//        | Number of Contents | Impression | Views | Likes | Comments | Published Date

export function parseContentsFile(buffer: ArrayBuffer): TypedParseResult {
  const wb   = XLSX.read(buffer, { type: 'array' })
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
      recorded_at: dateRaw ? new Date(str(dateRaw)).toISOString() : new Date().toISOString(),
    })
  })

  return { events, social, errors, rowCount: social.length }
}

// ── Co-streaming 파서 ───────────────────────────────────────────
// 컬럼: Year | Event | Region/Language | Streamer Name | Platform
//        | Peak View | ACCV | Cost | Currency
// 집계: 동일 Event + Region → BroadcastKpi 1개로 그룹화

export function parseCostreamingFile(buffer: ArrayBuffer): TypedParseResult {
  const wb   = XLSX.read(buffer, { type: 'array' })
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

    const peakView = numOrZero(raw['Peak View'])
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
  // 이벤트 병합 — ID가 아닌 name+year 기준으로 중복 체크
  // (Supabase UUID ID vs 로컬 문자열 ID 혼용 시 동일 이벤트가 두 번 들어가는 문제 방지)
  const mergedEvents = [...existing.events]
  for (const ev of result.events) {
    const isDup = mergedEvents.some(e =>
      e.id === ev.id || (e.name === ev.name && e.year === ev.year)
    )
    if (!isDup) mergedEvents.push(ev)
  }

  // 해당 이벤트 ID 집합
  const newEventIds = new Set(result.events.map(e => e.id))

  switch (type) {
    case 'viewership':
      return {
        ...existing,
        events: mergedEvents,
        // 새 데이터가 있는 이벤트의 기존 뷰어십 제거 후 새 데이터 추가
        viewership: [
          ...existing.viewership.filter(v => !newEventIds.has(v.event_id)),
          ...(result.viewership ?? []),
        ],
        uploadedAt: new Date().toISOString(),
      }
    case 'contents':
      return {
        ...existing,
        events: mergedEvents,
        social: [
          ...existing.social.filter(s => !newEventIds.has(s.event_id)),
          ...(result.social ?? []),
        ],
        uploadedAt: new Date().toISOString(),
      }
    case 'costreaming':
      return {
        ...existing,
        events: mergedEvents,
        broadcast: [
          ...existing.broadcast.filter(b => !newEventIds.has(b.event_id)),
          ...(result.broadcast ?? []),
        ],
        uploadedAt: new Date().toISOString(),
      }
  }
}
