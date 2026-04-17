import type { Event, ViewershipKpi, SocialKpi, BroadcastKpi, CompetitiveKpi, LiveEventKpi, KpiTarget } from '@/types'

export interface DashboardData {
  events:      Event[]
  viewership:  ViewershipKpi[]
  social:      SocialKpi[]
  broadcast:   BroadcastKpi[]
  competitive: CompetitiveKpi[]
  live_event:  LiveEventKpi[]
  kpi_targets: KpiTarget[]
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
 */
export function getViewershipTotal(data: DashboardData, eventId: string): ViewershipKpi | null {
  // Type B (플랫폼별) 우선 — 있으면 합산
  const perPlatform = data.viewership.filter(v => v.event_id === eventId && v.platform !== 'total')
  if (perPlatform.length > 0) {
    const peak_ccv       = perPlatform.reduce((s, v) => s + (v.peak_ccv ?? 0), 0) || undefined
    const acvTotal       = perPlatform.reduce((s, v) => s + (v.acv ?? 0), 0)
    const acv            = acvTotal > 0 ? acvTotal : undefined
    const unique_viewers = perPlatform.reduce((s, v) => s + (v.unique_viewers ?? 0), 0) || undefined
    return {
      id: 'aggregate', event_id: eventId,
      platform: 'total' as ViewershipKpi['platform'],
      peak_ccv, acv, unique_viewers,
      recorded_at: perPlatform[0].recorded_at,
    }
  }

  // Type A (통합) 폴백 — 'total' 행 직접 사용
  return data.viewership
    .filter(v => v.event_id === eventId && v.platform === 'total')
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0] ?? null
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

export function getViewershipByPlatform(data: DashboardData, eventId: string): ViewershipKpi[] {
  return data.viewership.filter(v => v.event_id === eventId && v.platform !== 'total')
}

export function getSocialByPlatform(data: DashboardData, eventId: string): SocialKpi[] {
  return data.social.filter(s => s.event_id === eventId)
}

export function getKpiTargets(data: DashboardData, eventId: string): KpiTarget[] {
  return data.kpi_targets.filter(t => t.event_id === eventId)
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

/** 코스트리밍 KPI (복수 이벤트, 선택적 지역 필터) */
export function getCostreamingAggregated(data: DashboardData, eventIds: string[], region?: string) {
  let rows = data.broadcast.filter(b => eventIds.includes(b.event_id))
  if (region) rows = rows.filter(b => b.region === region)
  return {
    streamer_count:  rows.reduce((sum, r) => sum + (r.co_streamer_count ?? 0), 0),
    peak_view_sum:   rows.reduce((sum, r) => sum + (r.co_streamer_viewers ?? 0), 0),
    total_cost_usd:  rows.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0),
    acv:             rows.length > 0 ? rows.reduce((sum, r) => sum + (r.acv ?? 0), 0) / rows.length : 0,
    rows,
  }
}
