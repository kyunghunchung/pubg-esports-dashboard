import * as XLSX from 'xlsx'
import type { Event } from '@/types'

export type ParsedSheet = 'viewership' | 'social' | 'broadcast' | 'competitive' | 'live_event' | 'kpi_targets'

export interface ParseError { sheet: string; row: number; message: string }

export interface ParsedRow {
  sheet: ParsedSheet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
}

export interface ParseResult {
  rows: ParsedRow[]
  errors: ParseError[]
  summary: Record<ParsedSheet, number>
}

function toDate(val: unknown): string {
  if (!val) return new Date().toISOString()
  if (typeof val === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val)
    return new Date(date.y, date.m - 1, date.d).toISOString()
  }
  return new Date(String(val)).toISOString()
}

function eventIdByName(name: string, events: Event[]): string | null {
  const normalized = name.trim().toLowerCase()
  return events.find((e) => e.name.toLowerCase() === normalized)?.id ?? null
}

export function parseUploadFile(buffer: ArrayBuffer, events: Event[]): ParseResult {
  const wb   = XLSX.read(buffer, { type: 'array' })
  const rows: ParsedRow[]  = []
  const errors: ParseError[] = []
  const summary = { viewership: 0, social: 0, broadcast: 0, competitive: 0, live_event: 0, kpi_targets: 0 }

  function processSheet<T>(
    sheetName: string,
    targetSheet: ParsedSheet,
    mapper: (raw: Record<string, unknown>, rowIdx: number) => T | null
  ) {
    const ws = wb.Sheets[sheetName]
    if (!ws) return
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
    rawRows.forEach((raw, i) => {
      const rowIdx = i + 2 // 헤더 = 1행
      try {
        const mapped = mapper(raw, rowIdx)
        if (mapped) {
          rows.push({ sheet: targetSheet, data: mapped as Record<string, unknown> })
          summary[targetSheet]++
        }
      } catch (e) {
        errors.push({ sheet: sheetName, row: rowIdx, message: String(e) })
      }
    })
  }

  // ── 뷰어십 ─────────────────────────────────────────────
  processSheet('뷰어십', 'viewership', (raw, rowIdx) => {
    const eventName = String(raw['이벤트명'] ?? '').trim()
    if (!eventName) return null
    const eventId = eventIdByName(eventName, events)
    if (!eventId) throw new Error(`이벤트 '${eventName}'를 찾을 수 없습니다`)

    const platform = String(raw['플랫폼'] ?? '').trim()
    const validPlatforms = ['twitch', 'youtube', 'afreeca', 'total']
    if (!validPlatforms.includes(platform)) throw new Error(`플랫폼 값 오류: '${platform}'`)

    return {
      event_id:        eventId,
      platform,
      peak_ccv:        Number(raw['Peak CCV'])        || null,
      acv:             Number(raw['ACV'])              || null,
      hours_watched:   Number(raw['Hours Watched'])    || null,
      unique_viewers:  Number(raw['순 시청자 수'])     || null,
      hours_broadcast: Number(raw['방송 시간(h)'])     || null,
      recorded_at:     toDate(raw['기록일(YYYY-MM-DD)']),
    }
  })

  // ── 소셜 ───────────────────────────────────────────────
  processSheet('소셜', 'social', (raw) => {
    const eventName = String(raw['이벤트명'] ?? '').trim()
    if (!eventName) return null
    const eventId = eventIdByName(eventName, events)
    if (!eventId) throw new Error(`이벤트 '${eventName}'를 찾을 수 없습니다`)

    const platform = String(raw['플랫폼'] ?? '').trim()
    const validPlatforms = ['x', 'instagram', 'facebook', 'tiktok', 'youtube']
    if (!validPlatforms.includes(platform)) throw new Error(`플랫폼 값 오류: '${platform}'`)

    return {
      event_id:       eventId,
      platform,
      impressions:    Number(raw['노출(Impressions)'])   || 0,
      engagements:    Number(raw['반응(Engagements)'])   || 0,
      video_views:    Number(raw['영상 뷰'])             || 0,
      follower_delta: Number(raw['팔로워 증감'])         || 0,
      recorded_at:    toDate(raw['기록일(YYYY-MM-DD)']),
    }
  })

  // ── 방송 ───────────────────────────────────────────────
  processSheet('방송', 'broadcast', (raw) => {
    const eventName = String(raw['이벤트명'] ?? '').trim()
    if (!eventName) return null
    const eventId = eventIdByName(eventName, events)
    if (!eventId) throw new Error(`이벤트 '${eventName}'를 찾을 수 없습니다`)

    return {
      event_id:            eventId,
      channel_count:       Number(raw['채널 수'])          || null,
      co_streamer_count:   Number(raw['코스트리머 수'])     || null,
      co_streamer_viewers: Number(raw['코스트리머 시청자']) || null,
      coverage_regions:    Number(raw['커버리지 국가 수'])  || null,
      clip_views:          Number(raw['클립 조회수'])       || null,
      recorded_at:         toDate(raw['기록일(YYYY-MM-DD)']),
    }
  })

  // ── 경쟁 ───────────────────────────────────────────────
  processSheet('경쟁', 'competitive', (raw) => {
    const eventName = String(raw['이벤트명'] ?? '').trim()
    if (!eventName) return null
    const eventId = eventIdByName(eventName, events)
    if (!eventId) throw new Error(`이벤트 '${eventName}'를 찾을 수 없습니다`)

    return {
      event_id:       eventId,
      team_count:     Number(raw['팀 수'])       || null,
      player_count:   Number(raw['선수 수'])      || null,
      country_count:  Number(raw['참가 국가 수']) || null,
      prize_pool_usd: Number(raw['상금(USD)'])    || null,
      recorded_at:    toDate(raw['기록일(YYYY-MM-DD)']),
    }
  })

  // ── 현장 ───────────────────────────────────────────────
  processSheet('현장', 'live_event', (raw) => {
    const eventName = String(raw['이벤트명'] ?? '').trim()
    if (!eventName) return null
    const eventId = eventIdByName(eventName, events)
    if (!eventId) throw new Error(`이벤트 '${eventName}'를 찾을 수 없습니다`)

    return {
      event_id:          eventId,
      total_attendance:  Number(raw['총 관객 수'])          || null,
      ticket_sales_rate: Number(raw['티켓 판매율(0~1)'])    || null,
      avg_occupancy:     Number(raw['평균 좌석 점유율(0~1)']) || null,
      recorded_at:       toDate(raw['기록일(YYYY-MM-DD)']),
    }
  })

  // ── KPI 목표값 ─────────────────────────────────────────
  processSheet('KPI목표값', 'kpi_targets', (raw) => {
    const eventName = String(raw['이벤트명'] ?? '').trim()
    if (!eventName) return null
    const eventId = eventIdByName(eventName, events)
    if (!eventId) throw new Error(`이벤트 '${eventName}'를 찾을 수 없습니다`)

    return {
      event_id:     eventId,
      category:     String(raw['카테고리']).trim(),
      metric:       String(raw['지표명(metric)']).trim(),
      target_value: Number(raw['목표값']),
      unit:         String(raw['단위'] ?? '').trim() || null,
    }
  })

  return { rows, errors, summary }
}
