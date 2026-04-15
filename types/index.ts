export type EventStatus = 'upcoming' | 'live' | 'completed'
export type EventType = 'PNC' | 'PGC' | 'PGS' | 'GOTF' | 'EWC' | 'ENC'
export type KpiCategory = 'viewership' | 'social' | 'broadcast' | 'competitive' | 'live_event'
export type SocialPlatform = 'x' | 'instagram' | 'facebook' | 'tiktok' | 'youtube'
export type ViewershipPlatform = 'twitch' | 'youtube' | 'afreeca' | 'total'
export type ReportType = 'event_result' | 'weekly' | 'annual'

export interface Event {
  id: string
  name: string
  type: EventType
  year: number
  start_date: string
  end_date: string
  venue?: string
  region?: string
  status: EventStatus
  created_at?: string
}

export interface KpiTarget {
  id: string
  event_id: string
  category: KpiCategory
  metric: string
  target_value: number
  unit?: string
}

export interface ViewershipKpi {
  id: string
  event_id: string
  platform: ViewershipPlatform
  peak_ccv?: number
  acv?: number
  hours_watched?: number
  unique_viewers?: number
  hours_broadcast?: number
  recorded_at: string
}

export interface SocialKpi {
  id: string
  event_id: string
  platform: SocialPlatform
  impressions: number
  engagements: number
  video_views: number
  follower_delta: number
  recorded_at: string
}

export interface BroadcastKpi {
  id: string
  event_id: string
  channel_count?: number
  co_streamer_count?: number
  co_streamer_viewers?: number
  coverage_regions?: number
  clip_views?: number
  recorded_at: string
}

export interface CompetitiveKpi {
  id: string
  event_id: string
  team_count?: number
  player_count?: number
  country_count?: number
  prize_pool_usd?: number
  recorded_at: string
}

export interface LiveEventKpi {
  id: string
  event_id: string
  total_attendance?: number
  ticket_sales_rate?: number
  avg_occupancy?: number
  recorded_at: string
}

export interface ReportHistory {
  id: string
  title: string
  type: ReportType
  event_ids?: string[]
  created_by?: string
  file_url?: string
  created_at: string
}

// 목표 대비 달성률 계산 결과
export interface KpiAchievement {
  metric: string
  target: number
  actual: number
  rate: number           // actual / target * 100
  status: 'danger' | 'warning' | 'success'  // <80 | 80~99 | 100+
  unit?: string
}
