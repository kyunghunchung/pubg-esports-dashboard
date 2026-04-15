import * as XLSX from 'xlsx'
import type { Event, ViewershipKpi, SocialKpi, BroadcastKpi, CompetitiveKpi, LiveEventKpi, KpiTarget } from '@/types'
import type { DashboardData } from '@/lib/store'
import {
  guessEventType,
  normalizeViewershipPlatform,
  normalizeSocialPlatform,
  MIN_YEAR,
  VIEWERSHIP_PLATFORMS,
  SOCIAL_PLATFORMS,
} from '@/lib/config/constants'

export type ParsedSheet = 'viewership' | 'social' | 'broadcast' | 'competitive' | 'live_event' | 'kpi_targets'

export interface ParseError { sheet: string; row: number; message: string }

export interface ParseResult {
  data:   DashboardData
  errors: ParseError[]
  summary: Record<ParsedSheet | 'events', number>
  format?: 'template' | 'legacy'
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

// 이벤트명 + 연도 → 결정론적 ID
function makeEventId(name: string, year: number | string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + year
}

function findEventId(name: string, events: Event[]): string | null {
  const normalized = name.trim().toLowerCase()
  return events.find(e => e.name.toLowerCase() === normalized)?.id ?? null
}

// guessEventType은 lib/config/constants.ts에서 import

// ─────────────────────────────────────────────────────────────────────────────
// 레거시 파서 — "PUBG Esports 뷰어십 (20XX-20XX).xlsx" 형식
// 시트: '글로벌 대회' | '지역 대회'
// ─────────────────────────────────────────────────────────────────────────────
function parseLegacyFile(wb: XLSX.WorkBook): ParseResult {
  const events: Event[] = []
  const viewership: ViewershipKpi[] = []
  const errors: ParseError[] = []
  const summary: Record<ParsedSheet | 'events', number> = {
    events: 0, viewership: 0, social: 0, broadcast: 0, competitive: 0, live_event: 0, kpi_targets: 0,
  }

  const nowYear = new Date().getFullYear()

  function upsertEvent(name: string, year: number, region?: string): string {
    const id = makeEventId(name, year)
    if (!events.find(e => e.id === id)) {
      events.push({
        id,
        name,
        type:       guessEventType(name),
        year,
        start_date: `${year}-01-01`,
        end_date:   `${year}-12-31`,
        region,
        status:     year < nowYear ? 'completed' : year === nowYear ? 'live' : 'upcoming',
      })
      summary.events++
    }
    return id
  }

  // ── 글로벌 대회 ───────────────────────────────────────────
  const globalWs = wb.Sheets['글로벌 대회']
  if (globalWs) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(globalWs, { header: 1, defval: '' }) as unknown[][]
    rows.forEach((row, i) => {
      if (i === 0) return // 헤더 스킵
      const year = typeof row[0] === 'number' ? row[0] : 0
      const name = String(row[1] ?? '').trim()
      if (!year || !name || name.includes('──')) return // 구분자 스킵

      const pcv  = typeof row[2] === 'number' ? row[2] : undefined
      const accv = typeof row[3] === 'number' ? row[3] : undefined
      const uv   = typeof row[4] === 'number' ? row[4] : undefined

      if (!pcv && !accv) return // 숫자 데이터 없으면 스킵 (설명 행)

      try {
        const event_id = upsertEvent(name, year)
        viewership.push({
          id:             crypto.randomUUID(),
          event_id,
          platform:       'total',
          peak_ccv:       pcv,
          acv:            accv,
          unique_viewers: uv,
          recorded_at:    new Date(year, 11, 31).toISOString(),
        })
        summary.viewership++
      } catch (e) {
        errors.push({ sheet: '글로벌 대회', row: i + 1, message: String(e) })
      }
    })
  }

  // ── 지역 대회 ──────────────────────────────────────────────
  const localWs = wb.Sheets['지역 대회']
  if (localWs) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(localWs, { header: 1, defval: '' }) as unknown[][]
    rows.forEach((row, i) => {
      if (i === 0) return
      const year   = typeof row[0] === 'number' ? row[0] : 0
      const name   = String(row[1] ?? '').trim()
      if (!year || !name || name.includes('──')) return

      const region = String(row[2] ?? '').trim() || undefined
      const pcv    = typeof row[3] === 'number' ? row[3] : undefined
      if (!pcv) return // "-" 또는 빈 값 스킵

      try {
        const event_id = upsertEvent(name, year, region)
        // 이미 글로벌 대회 시트에서 뷰어십 데이터가 들어온 경우 중복 추가 안 함
        if (!viewership.find(v => v.event_id === event_id)) {
          viewership.push({
            id:         crypto.randomUUID(),
            event_id,
            platform:   'total',
            peak_ccv:   pcv,
            recorded_at: new Date(year, 11, 31).toISOString(),
          })
          summary.viewership++
        }
      } catch (e) {
        errors.push({ sheet: '지역 대회', row: i + 1, message: String(e) })
      }
    })
  }

  return {
    data: {
      events,
      viewership,
      social:      [],
      broadcast:   [],
      competitive: [],
      live_event:  [],
      kpi_targets: [],
      uploadedAt:  new Date().toISOString(),
    },
    errors,
    summary,
    format: 'legacy',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 템플릿 파서 (기존)
// ─────────────────────────────────────────────────────────────────────────────
function parseTemplateFile(wb: XLSX.WorkBook): ParseResult {
  const errors: ParseError[] = []
  const summary: Record<ParsedSheet | 'events', number> = {
    events: 0, viewership: 0, social: 0, broadcast: 0, competitive: 0, live_event: 0, kpi_targets: 0,
  }

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
          status:     String(raw['상태'] ?? 'completed').trim() as Event['status'],
        })
        summary.events++
      } catch (e) {
        errors.push({ sheet: '이벤트', row: i + 2, message: String(e) })
      }
    })
  }

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

  // 이벤트명이 빈칸이면 null(스킵), 이벤트명은 있지만 이벤트 시트에 없으면 에러
  function requireEvent(raw: Record<string, unknown>): string | null {
    const name = String(raw['이벤트명'] ?? '').trim()
    if (!name) return null  // 빈칸 → 조용히 스킵
    const id = findEventId(name, events)
    if (!id) throw new Error(`'${name}' 이벤트를 찾을 수 없습니다. 이벤트 시트에 먼저 추가하세요.`)
    return id
  }

  const viewership = processSheet<ViewershipKpi>('뷰어십', 'viewership', (raw, rowIdx) => {
    const event_id = requireEvent(raw)
    if (event_id === null) return null  // 이벤트명 빈칸 → 스킵

    // '플랫폼(선택)' 또는 '플랫폼' 모두 허용, 빈칸이면 total(전체 합산)로 간주
    const platformInput = String(raw['플랫폼(선택)'] ?? raw['플랫폼'] ?? '').trim()
    const platform = platformInput
      ? normalizeViewershipPlatform(platformInput)
      : 'total'
    if (!platform) {
      const valid = Object.keys(VIEWERSHIP_PLATFORMS).join(' / ')
      throw new Error(`플랫폼 값 오류: '${platformInput}'. 허용값: ${valid}`)
    }
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

  const social = processSheet<SocialKpi>('소셜', 'social', (raw, rowIdx) => {
    const event_id = requireEvent(raw)
    if (event_id === null) return null

    const platformInput = String(raw['플랫폼'] ?? '').trim()
    if (!platformInput) return null  // 플랫폼 빈칸 → 스킵
    const platform = normalizeSocialPlatform(platformInput)
    if (!platform) {
      const valid = Object.keys(SOCIAL_PLATFORMS).join(' / ')
      throw new Error(`플랫폼 값 오류: '${platformInput}'. 허용값: ${valid}`)
    }
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

  const broadcast = processSheet<BroadcastKpi>('방송', 'broadcast', (raw, rowIdx) => {
    const event_id = requireEvent(raw)
    if (event_id === null) return null
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

  const competitive = processSheet<CompetitiveKpi>('경쟁', 'competitive', (raw, rowIdx) => {
    const event_id = requireEvent(raw)
    if (event_id === null) return null
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

  const live_event = processSheet<LiveEventKpi>('현장', 'live_event', (raw, rowIdx) => {
    const event_id = requireEvent(raw)
    if (event_id === null) return null
    return {
      id:                crypto.randomUUID(),
      event_id,
      total_attendance:  Number(raw['총 관객 수'])               || undefined,
      ticket_sales_rate: Number(raw['티켓 판매율(0~1)'])         || undefined,
      avg_occupancy:     Number(raw['평균 좌석 점유율(0~1)'])    || undefined,
      recorded_at:       toDate(raw['기록일(YYYY-MM-DD)']),
    }
  })

  const kpi_targets = processSheet<KpiTarget>('KPI목표값', 'kpi_targets', (raw, rowIdx) => {
    const event_id = requireEvent(raw)
    if (event_id === null) return null
    const metric = String(raw['지표명(metric)'] ?? '').trim()
    if (!metric) return null  // 지표명 빈칸 → 스킵
    return {
      id:           crypto.randomUUID(),
      event_id,
      category:     String(raw['카테고리'] ?? '').trim() as KpiTarget['category'],
      metric,
      target_value: Number(raw['목표값']),
      unit:         String(raw['단위'] ?? '').trim() || undefined,
    }
  })

  return {
    data: { events, viewership, social, broadcast, competitive, live_event, kpi_targets, uploadedAt: new Date().toISOString() },
    errors,
    summary,
    format: 'template',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 진입점 — 파일 형식 자동 감지
// ─────────────────────────────────────────────────────────────────────────────
export function parseUploadFile(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: 'array' })

  // 레거시 형식 감지: '글로벌 대회' 또는 '지역 대회' 시트가 있으면 레거시
  const isLegacy = wb.SheetNames.includes('글로벌 대회') || wb.SheetNames.includes('지역 대회')
  if (isLegacy) return parseLegacyFile(wb)

  return parseTemplateFile(wb)
}
