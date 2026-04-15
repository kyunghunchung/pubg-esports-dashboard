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

export function getViewershipTotal(data: DashboardData, eventId: string): ViewershipKpi | null {
  return data.viewership
    .filter(v => v.event_id === eventId && v.platform === 'total')
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0] ?? null
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
