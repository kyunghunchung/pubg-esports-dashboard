import type { Event, ViewershipKpi, SocialKpi, CostreamingKpi } from '@/types'
import type { EventMasterEntry } from '@/lib/config/event-master'

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

// ── Content Calendar (연간 주차별 콘텐츠 + 이벤트 밴드 + 뷰어십) ─────────────

export interface ContentCalendarWeek {
  wk:        string        // 'W01' ~ 'W53'
  weekStart: string        // 'YYYY-MM-DD' (월요일)
  weekEnd:   string        // 'YYYY-MM-DD' (일요일)
  content:   number
  pccv:      number | null
}

export interface ContentCalendarBand {
  event_id:     string
  display_name: string
  start_date:   string
  end_date:     string
  startWk:      string
  endWk:        string
  pccv:         number | null
  color:        string
}

export interface ContentCalendarData {
  weeks:  ContentCalendarWeek[]
  events: ContentCalendarBand[]
}

const BAND_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#F97316',
]

function isoWeekOf(dateStr: string): { isoYear: number; week: number; weekStart: string } | null {
  if (!dateStr) return null
  const ymd = dateStr.slice(0, 10)
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return null
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const monOffset = (dayOfWeek + 6) % 7
  const monday = new Date(Date.UTC(y, m - 1, d - monOffset))
  const thursday = new Date(monday); thursday.setUTCDate(monday.getUTCDate() + 3)
  const isoYear = thursday.getUTCFullYear()
  const jan4 = new Date(Date.UTC(isoYear, 0, 4))
  const week = 1 + Math.round(
    ((thursday.getTime() - jan4.getTime()) / 86400000 - 3 + (jan4.getUTCDay() + 6) % 7) / 7
  )
  return { isoYear, week, weekStart: monday.toISOString().slice(0, 10) }
}

function allWeeksOfYear(year: number): ContentCalendarWeek[] {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const firstMonday = new Date(jan4)
  firstMonday.setUTCDate(4 - (jan4.getUTCDay() + 6) % 7)
  const result: ContentCalendarWeek[] = []
  const cur = new Date(firstMonday)
  while (true) {
    const info = isoWeekOf(cur.toISOString().slice(0, 10))
    if (!info || info.isoYear > year) break
    if (info.isoYear === year) {
      const sun = new Date(cur); sun.setUTCDate(cur.getUTCDate() + 6)
      result.push({
        wk:        `W${String(info.week).padStart(2, '0')}`,
        weekStart: cur.toISOString().slice(0, 10),
        weekEnd:   sun.toISOString().slice(0, 10),
        content:   0,
        pccv:      null,
      })
    }
    cur.setUTCDate(cur.getUTCDate() + 7)
  }
  return result
}

export function getContentCalendar(
  data: DashboardData,
  year: number,
  masterEntries: EventMasterEntry[],
): ContentCalendarData {
  const weeks = allWeeksOfYear(year)
  const wkMap = new Map(weeks.map((w, i) => [w.wk, i]))

  // 콘텐츠 주차별 집계
  for (const s of data.social) {
    const info = isoWeekOf(s.recorded_at)
    if (!info || info.isoYear !== year) continue
    const wk = `W${String(info.week).padStart(2, '0')}`
    const idx = wkMap.get(wk)
    if (idx !== undefined) weeks[idx].content += s.content_count ?? 0
  }

  // 이벤트별 최대 PCCV (total 행 우선, 없으면 최대값)
  const pccvByEventId = new Map<string, number>()
  for (const v of data.viewership) {
    if (!v.peak_ccv) continue
    const eid = v.event_id
    if (v.platform === 'total') {
      pccvByEventId.set(eid, Math.max(pccvByEventId.get(eid) ?? 0, v.peak_ccv))
    }
  }
  for (const v of data.viewership) {
    if (!v.peak_ccv || pccvByEventId.has(v.event_id)) continue
    pccvByEventId.set(v.event_id, Math.max(pccvByEventId.get(v.event_id) ?? 0, v.peak_ccv))
  }

  // 이벤트 밴드 (날짜 있는 것만)
  const bands: ContentCalendarBand[] = []
  const yearEntries = masterEntries.filter(e => e.year === year && e.start_date && e.end_date)
  yearEntries.forEach((entry, i) => {
    const s = isoWeekOf(entry.start_date!)
    const e = isoWeekOf(entry.end_date!)
    if (!s || !e) return
    const startWk = `W${String(s.week).padStart(2, '0')}`
    const endWk   = `W${String(e.week).padStart(2, '0')}`

    // data.events는 event_id(=name)로 연결
    const ev = data.events.find(ev => ev.name === entry.event_id)
    const pccv = ev ? (pccvByEventId.get(ev.id) ?? null) : null

    // PCCV를 이벤트 중간 주차에 배치
    if (pccv != null) {
      const si = wkMap.get(startWk) ?? 0
      const ei = wkMap.get(endWk) ?? si
      const mid = weeks[Math.round((si + ei) / 2)]
      if (mid) mid.pccv = pccv
    }

    bands.push({ event_id: entry.event_id, display_name: entry.display_name,
      start_date: entry.start_date!, end_date: entry.end_date!,
      startWk, endWk, pccv, color: BAND_COLORS[i % BAND_COLORS.length] })
  })

  return { weeks, events: bands }
}
