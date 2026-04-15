import * as XLSX from 'xlsx'
import type { Event, ViewershipKpi, SocialKpi, BroadcastKpi, CompetitiveKpi, LiveEventKpi, KpiTarget } from '@/types'
import type { DashboardData } from '@/lib/store'

export type ParsedSheet = 'viewership' | 'social' | 'broadcast' | 'competitive' | 'live_event' | 'kpi_targets'

export interface ParseError { sheet: string; row: number; message: string }

export interface ParseResult {
  data:   DashboardData
  errors: ParseError[]
  summary: Record<ParsedSheet | 'events', number>
}

// Excel serial date → ISO string
function toDate(val: unknown): string {
  if (!val) return new Date().toISOString()
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    return new Date(d.y, d.m - 1, d.d).toISOString()
  }
  return new Date(String(val)).toISOString()
}

// 이벤트명 + 연도 → 결정론적 ID (재업로드 시 중복 방지)
function makeEventId(name: string, year: number | string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + year
}

function findEventId(name: string, events: Event[]): string | null {
  const normalized = name.trim().toLowerCase()
  return events.find(e => e.name.toLowerCase() === normalized)?.id ?? null
}

export function parseUploadFile(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: 'array' })
  const errors: ParseError[] = []
  const summary: Record<ParsedSheet | 'events', number> = {
    events: 0, viewership: 0, social: 0, broadcast: 0, competitive: 0, live_event: 0, kpi_targets: 0,
  }

  // ── 1. 이벤트 시트 파싱 ───────────────────────────────────
  const events: Event[] = []
  const evWs = wb.Sheets['이벤트']
  if (evWs) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(evWs, { defval: '' })
    rows.forEach((raw, i) => {
      const name = String(raw['이벤트명'] ?? '').trim()
      if (!name) return
      const year = Number(raw['연도']) || new Date().getFullYear()
      try {
        events.push({
          id:         makeEventId(name, year),
          name,
          type:       String(raw['유형'] ?? 'PGS').trim() as Event['type'],
          year,
          start_date: String(raw['시작일'] ?? '').trim(),
          end_date:   String(raw['종료일'] ?? '').trim(),
          venue:      String(raw['장소'] ?? '').trim() || undefined,
          region:     String(raw['지역'] ?? '').trim() || undefined,
          status:     (String(raw['상태'] ?? 'completed').trim()) as Event['status'],
        })
        summary.events++
      } catch (e) {
        errors.push({ sheet: '이벤트', row: i + 2, message: String(e) })
      }
    })
  }

  // ── 헬퍼 ─────────────────────────────────────────────────
  function processSheet<T>(
    sheetName: string,
    target: ParsedSheet,
    mapper: (raw: Record<string, unknown>, rowIdx: number) => T | null
  ): T[] {
    const ws = wb.Sheets[sheetName]
    if (!ws) return []
    const results: T[] = []
    XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' }).forEach((raw, i) => {
      const rowIdx = i + 2
      try {
        const mapped = mapper(raw, rowIdx)
        if (mapped) { results.push(mapped); summary[target]++ }
      } catch (e) {
        errors.push({ sheet: sheetName, row: rowIdx, message: String(e) })
      }
    })
    return results
  }

  function requireEvent(raw: Record<string, unknown>, sheetName: string, rowIdx: number): string {
    const name = String(raw['이벤트명'] ?? '').trim()
    if (!name) throw new Error('이벤트명이 비어있습니다')
    const id = findEventId(name, events)
    if (!id) throw new Error(`'${name}' 이벤트를 찾을 수 없습니다. 이벤트 시트에 먼저 추가하세요.`)
    return id
  }

  // ── 2. 뷰어십 ─────────────────────────────────────────────
  const viewership = processSheet<ViewershipKpi>('뷰어십', 'viewership', (raw, rowIdx) => {
    const event_id = requireEvent(raw, '뷰어십', rowIdx)
    const platform = String(raw['플랫폼'] ?? '').trim()
    if (!['twitch', 'youtube', 'afreeca', 'total'].includes(platform))
      throw new Error(`플랫폼 값 오류: '${platform}'`)
    return {
      id:              crypto.randomUUID(),
      event_id,
      platform:        platform as ViewershipKpi['platform'],
      peak_ccv:        Number(raw['Peak CCV'])        || undefined,
      acv:             Number(raw['ACV'])              || undefined,
      hours_watched:   Number(raw['Hours Watched'])    || undefined,
      unique_viewers:  Number(raw['순 시청자 수'])     || undefined,
      hours_broadcast: Number(raw['방송 시간(h)'])     || undefined,
      recorded_at:     toDate(raw['기록일(YYYY-MM-DD)']),
    }
  })

  // ── 3. 소셜 ───────────────────────────────────────────────
  const social = processSheet<SocialKpi>('소셜', 'social', (raw, rowIdx) => {
    const event_id = requireEvent(raw, '소셜', rowIdx)
    const platform = String(raw['플랫폼'] ?? '').trim()
    if (!['x', 'instagram', 'facebook', 'tiktok', 'youtube'].includes(platform))
      throw new Error(`플랫폼 값 오류: '${platform}'`)
    return {
      id:             crypto.randomUUID(),
      event_id,
      platform:       platform as SocialKpi['platform'],
      impressions:    Number(raw['노출(Impressions)']) || 0,
      engagements:    Number(raw['반응(Engagements)']) || 0,
      video_views:    Number(raw['영상 뷰'])           || 0,
      follower_delta: Number(raw['팔로워 증감'])       || 0,
      recorded_at:    toDate(raw['기록일(YYYY-MM-DD)']),
    }
  })

  // ── 4. 방송 ───────────────────────────────────────────────
  const broadcast = processSheet<BroadcastKpi>('방송', 'broadcast', (raw, rowIdx) => {
    const event_id = requireEvent(raw, '방송', rowIdx)
    return {
      id:                  crypto.randomUUID(),
      event_id,
      channel_count:       Number(raw['채널 수'])           || undefined,
      co_streamer_count:   Number(raw['코스트리머 수'])      || undefined,
      co_streamer_viewers: Number(raw['코스트리머 시청자'])  || undefined,
      coverage_regions:    Number(raw['커버리지 국가 수'])   || undefined,
      clip_views:          Number(raw['클립 조회수'])        || undefined,
      recorded_at:         toDate(raw['기록일(YYYY-MM-DD)']),
    }
  })

  // ── 5. 경쟁 ───────────────────────────────────────────────
  const competitive = processSheet<CompetitiveKpi>('경쟁', 'competitive', (raw, rowIdx) => {
    const event_id = requireEvent(raw, '경쟁', rowIdx)
    return {
      id:             crypto.randomUUID(),
      event_id,
      team_count:     Number(raw['팀 수'])        || undefined,
      player_count:   Number(raw['선수 수'])       || undefined,
      country_count:  Number(raw['참가 국가 수'])  || undefined,
      prize_pool_usd: Number(raw['상금(USD)'])     || undefined,
      recorded_at:    toDate(raw['기록일(YYYY-MM-DD)']),
    }
  })

  // ── 6. 현장 ───────────────────────────────────────────────
  const live_event = processSheet<LiveEventKpi>('현장', 'live_event', (raw, rowIdx) => {
    const event_id = requireEvent(raw, '현장', rowIdx)
    return {
      id:                crypto.randomUUID(),
      event_id,
      total_attendance:  Number(raw['총 관객 수'])               || undefined,
      ticket_sales_rate: Number(raw['티켓 판매율(0~1)'])         || undefined,
      avg_occupancy:     Number(raw['평균 좌석 점유율(0~1)'])    || undefined,
      recorded_at:       toDate(raw['기록일(YYYY-MM-DD)']),
    }
  })

  // ── 7. KPI 목표값 ──────────────────────────────────────────
  const kpi_targets = processSheet<KpiTarget>('KPI목표값', 'kpi_targets', (raw, rowIdx) => {
    const event_id = requireEvent(raw, 'KPI목표값', rowIdx)
    return {
      id:           crypto.randomUUID(),
      event_id,
      category:     String(raw['카테고리']).trim() as KpiTarget['category'],
      metric:       String(raw['지표명(metric)']).trim(),
      target_value: Number(raw['목표값']),
      unit:         String(raw['단위'] ?? '').trim() || undefined,
    }
  })

  return {
    data: { events, viewership, social, broadcast, competitive, live_event, kpi_targets, uploadedAt: new Date().toISOString() },
    errors,
    summary,
  }
}
