import type { Event, ViewershipKpi, SocialKpi, CostreamingKpi } from '@/types'

export interface DashboardData {
  events:      Event[]
  viewership:  ViewershipKpi[]
  social:      SocialKpi[]
  costreaming: CostreamingKpi[]
  uploadedAt:  string
}

const KEY = 'pubg_dashboard_v1'

export function saveData(data: DashboardData): void {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function loadData(): DashboardData | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function clearData(): void {
  localStorage.removeItem(KEY)
}

// ── 쿼리 헬퍼 ──────────────────────────────────────────────────────────────

/**
 * Type B (플랫폼별) 데이터가 있으면 합산 집계값을 반환 (v6 우선순위).
 * Type B 없고 Type A ('total') 만 있으면 Type A 행을 직접 반환.
 * officialOnly=true 이면 is_official===true 행만 집계.
 */
export function getViewershipTotal(
  data: DashboardData,
  eventId: string,
  officialOnly = false,
): ViewershipKpi | null {
  // Type B (플랫폼별) 우선 — 있으면 합산
  let perPlatform = data.viewership.filter(v => v.event_id === eventId && v.platform !== 'total')
  if (officialOnly) perPlatform = perPlatform.filter(v => v.is_official === true)

  if (perPlatform.length > 0) {
    const peak_ccv       = perPlatform.reduce((s, v) => s + (v.peak_ccv ?? 0), 0) || undefined
    const acvTotal       = perPlatform.reduce((s, v) => s + (v.acv ?? 0), 0)
    const acv            = acvTotal > 0 ? acvTotal : undefined
    const unique_viewers = perPlatform.reduce((s, v) => s + (v.unique_viewers ?? 0), 0) || undefined
    const hwTotal        = perPlatform.reduce((s, v) => s + (v.hours_watched ?? 0), 0)
    const hours_watched  = hwTotal > 0 ? hwTotal : undefined
    return {
      id: 'aggregate', event_id: eventId,
      platform: 'total' as ViewershipKpi['platform'],
      peak_ccv, acv, unique_viewers, hours_watched,
      recorded_at: perPlatform[0].recorded_at,
    }
  }

  // Type A (통합) 폴백 — 'total' 행 직접 사용 (officialOnly 필터 적용)
  const typeARows = data.viewership
    .filter(v => v.event_id === eventId && v.platform === 'total')
    .filter(v => !officialOnly || v.is_official === true)
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
  return typeARows[0] ?? null
}

/**
 * 단일 이벤트의 뷰어십 데이터 타입 반환.
 * 'B' = 플랫폼별 분리 데이터 존재 (Type B 우선)
 * 'A' = 통합 데이터만 존재 (Type A)
 * 'none' = 데이터 없음
 */
export function getViewershipDataType(data: DashboardData, eventId: string): 'A' | 'B' | 'none' {
  const rows = data.viewership.filter(v => v.event_id === eventId)
  if (rows.some(v => v.platform !== 'total')) return 'B'
  if (rows.some(v => v.platform === 'total'))  return 'A'
  return 'none'
}

export function getViewershipByPlatform(
  data: DashboardData,
  eventId: string,
  officialOnly = false,
): ViewershipKpi[] {
  return data.viewership.filter(v =>
    v.event_id === eventId &&
    v.platform !== 'total' &&
    (!officialOnly || v.is_official === true)
  )
}

export function getSocialByPlatform(data: DashboardData, eventId: string): SocialKpi[] {
  return data.social.filter(s => s.event_id === eventId)
}

/** 복수 이벤트에 걸친 콘텐츠 KPI 집계 (노출 합산, 콘텐츠 발행 수 합산) */
export function getContentAggregated(data: DashboardData, eventIds: string[]) {
  const rows = data.social.filter(s => eventIds.includes(s.event_id))
  return {
    impressions:   rows.reduce((sum, r) => sum + r.impressions, 0),
    content_count: rows.reduce((sum, r) => sum + (r.content_count ?? 0), 0),
  }
}

/** 소셜 데이터를 플랫폼별로 집계 (복수 이벤트 합산) */
export function getSocialAggregatedByPlatform(data: DashboardData, eventIds: string[]) {
  const rows = data.social.filter(s => eventIds.includes(s.event_id))
  const map = new Map<string, { platform: string; impressions: number; engagements: number; video_views: number; content_count: number }>()
  for (const row of rows) {
    const existing = map.get(row.platform)
    if (existing) {
      existing.impressions   += row.impressions
      existing.engagements   += row.engagements
      existing.video_views   += row.video_views
      existing.content_count += row.content_count ?? 0
    } else {
      map.set(row.platform, {
        platform:      row.platform,
        impressions:   row.impressions,
        engagements:   row.engagements,
        video_views:   row.video_views,
        content_count: row.content_count ?? 0,
      })
    }
  }
  return Array.from(map.values())
}

export interface SocialTrendPoint {
  period:        string   // 'YYYY-MM' or 'YYYY-Www'
  impressions:   number
  content_count: number
  engagements:   number
  video_views:   number
}

/** 소셜 데이터를 월간/주간 기준으로 집계 — Date 컬럼이 업로드된 경우에만 의미 있음 */
export function getSocialTrend(
  data: DashboardData,
  eventIds: string[],
  period: 'monthly' | 'weekly',
  filters: {
    platform?:      string
    region?:        string
    content_type_1?: string
    content_type_2?: string
  } = {}
): SocialTrendPoint[] {
  let rows = data.social.filter(s => eventIds.includes(s.event_id))
  if (filters.platform)       rows = rows.filter(s => s.platform === filters.platform)
  if (filters.region)         rows = rows.filter(s => s.region   === filters.region)
  if (filters.content_type_1) rows = rows.filter(s => s.content_type_1 === filters.content_type_1)
  if (filters.content_type_2) rows = rows.filter(s => s.content_type_2 === filters.content_type_2)

  function periodKey(iso: string | null | undefined): string {
    if (!iso) return 'unknown'
    // UTC 날짜 기준으로 파싱 (로컬 시간대 영향 배제)
    const ymd = iso.slice(0, 10)  // "YYYY-MM-DD"
    const [y, m, day] = ymd.split('-').map(Number)
    if (!y || !m || !day) return 'unknown'
    if (period === 'monthly') {
      return `${y}-${String(m).padStart(2, '0')}`
    }
    // ISO 주차 계산 — UTC 기반 Date 사용
    const d = new Date(Date.UTC(y, m - 1, day))
    const dayOfWeek = d.getUTCDay()  // 0=일 ~ 6=토
    const thursday = new Date(d)
    thursday.setUTCDate(day + 3 - (dayOfWeek + 6) % 7)  // 같은 주 목요일
    const isoYear = thursday.getUTCFullYear()
    const jan4 = new Date(Date.UTC(isoYear, 0, 4))
    const jan4Day = jan4.getUTCDay()
    const week = 1 + Math.round(
      ((thursday.getTime() - jan4.getTime()) / 86400000 - 3 + (jan4Day + 6) % 7) / 7
    )
    // 라벨: 주 시작(월)~끝(일) 날짜 표시
    const mon = new Date(d)
    mon.setUTCDate(day - (dayOfWeek + 6) % 7)
    const sun = new Date(mon)
    sun.setUTCDate(mon.getUTCDate() + 6)
    const fmt = (dt: Date) => `${dt.getUTCMonth() + 1}/${String(dt.getUTCDate()).padStart(2, '0')}`
    return `${isoYear}-W${String(week).padStart(2, '0')}|${fmt(mon)}~${fmt(sun)}`
  }

  const map = new Map<string, SocialTrendPoint>()
  for (const row of rows) {
    const key = periodKey(row.recorded_at)
    const cur = map.get(key) ?? { period: key, impressions: 0, content_count: 0, engagements: 0, video_views: 0 }
    cur.impressions   += row.impressions
    cur.content_count += row.content_count ?? 0
    cur.engagements   += row.engagements
    cur.video_views   += row.video_views
    map.set(key, cur)
  }

  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period))
}

/** 소셜 데이터에 유효한 날짜가 있는지 확인 (트렌드 뷰 표시 여부 결정) */
export function hasSocialDateData(data: DashboardData, eventIds: string[]): boolean {
  const rows = data.social.filter(s => eventIds.includes(s.event_id))
  if (rows.length < 2) return false
  const dates = new Set(rows.map(s => s.recorded_at?.slice(0, 10)).filter(Boolean))
  return dates.size > 1  // 날짜가 2개 이상 다르면 날짜 데이터 있음
}

/** 코스트리밍 KPI (복수 이벤트, 선택적 지역 필터) */
export function getCostreamingAggregated(data: DashboardData, eventIds: string[], region?: string) {
  let rows = data.costreaming.filter(b => eventIds.includes(b.event_id))
  if (region) rows = rows.filter(b => b.region === region)
  return {
    streamer_count:  rows.reduce((sum, r) => sum + (r.co_streamer_count ?? 0), 0),
    peak_view_sum:   rows.reduce((sum, r) => sum + (r.co_streamer_viewers ?? 0), 0),
    hours_watched:   rows.reduce((sum, r) => sum + (r.hours_watched ?? 0), 0),
    total_cost_usd:  rows.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0),
    // ACCV: 채널별 ACCV 합산 (평균이 아닌 총합)
    acv:             rows.reduce((sum, r) => sum + (r.acv ?? 0), 0),
    rows,
  }
}

/** 코스트리밍 언어(지역)별 집계 */
export function getCostreamingByRegion(data: DashboardData, eventIds: string[]) {
  const rows = data.costreaming.filter(b => eventIds.includes(b.event_id) && b.region)
  const map = new Map<string, { region: string; viewers: number; streamer_count: number }>()
  for (const r of rows) {
    const key = r.region!
    const cur = map.get(key) ?? { region: key, viewers: 0, streamer_count: 0 }
    cur.viewers       += r.co_streamer_viewers ?? 0
    cur.streamer_count += r.co_streamer_count ?? 0
    map.set(key, cur)
  }
  return Array.from(map.values()).sort((a, b) => b.viewers - a.viewers)
}

/** 코스트리밍 플랫폼별 집계 */
export function getCostreamingByPlatform(data: DashboardData, eventIds: string[]) {
  const rows = data.costreaming.filter(b => eventIds.includes(b.event_id) && b.platform)
  const map = new Map<string, { platform: string; viewers: number; streamer_count: number }>()
  for (const r of rows) {
    const key = r.platform!
    const cur = map.get(key) ?? { platform: key, viewers: 0, streamer_count: 0 }
    cur.viewers       += r.co_streamer_viewers ?? 0
    cur.streamer_count += r.co_streamer_count ?? 0
    map.set(key, cur)
  }
  return Array.from(map.values()).sort((a, b) => b.viewers - a.viewers)
}
