export type EventStatus = 'upcoming' | 'live' | 'completed'
// 글로벌: PGS | PNC | PGC | EWC | PMI(Players Masters Invitational)  /  지역: Regional
export type EventType = 'PGS' | 'PNC' | 'PGC' | 'EWC' | 'PMI' | 'ENC' | 'Regional'
export type KpiCategory = 'viewership' | 'social' | 'costreaming'
// 통합 플랫폼 (lib/config/constants.ts PLATFORMS와 동기화)
export type Platform = 'chzzk' | 'facebook' | 'instagram' | 'kick' | 'nimotv' | 'soop_global' | 'soop_korea' | 'steam' | 'tiktok' | 'trovo' | 'twitch' | 'x' | 'youtube'
// 뷰어십은 합산 행을 위해 'total' 추가
export type ViewershipPlatform = Platform | 'total'
// 소셜(콘텐츠)은 통합 플랫폼과 동일
export type SocialPlatform = Platform
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

export interface ViewershipKpi {
  id: string
  event_id: string
  platform: ViewershipPlatform
  peak_ccv?: number
  acv?: number
  hours_watched?: number
  unique_viewers?: number
  hours_broadcast?: number
  is_official?: boolean
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
  content_count?: number      // 콘텐츠 발행 수 (게시물 수)
  region?: string             // 지역/언어 (KR / EN / JP / SEA 등)
  content_type_1?: string     // 콘텐츠 종류 1 (숏폼 / 롱폼 / 포스트)
  content_type_2?: string     // 콘텐츠 종류 2 (하이라이트 / 프로모션 / 하이핑)
  recorded_at: string
}

export interface CostreamingKpi {
  id: string
  event_id: string
  platform?: string             // 플랫폼 (집계 단위)
  channel_count?: number
  co_streamer_count?: number
  co_streamer_viewers?: number  // Peak View 합산
  hours_watched?: number        // 시청 시간 합산
  coverage_regions?: number
  clip_views?: number
  region?: string               // 지역/언어 필터용
  acv?: number                  // ACCV 합산 (per-channel sum)
  cost_usd?: number             // 코스트리밍 집행 비용 (ROI 계산용)
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
