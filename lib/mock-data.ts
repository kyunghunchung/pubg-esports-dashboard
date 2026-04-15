import type {
  Event, KpiTarget, ViewershipKpi, SocialKpi,
  BroadcastKpi, CompetitiveKpi, LiveEventKpi, ReportHistory,
} from '@/types'

export const MOCK_EVENTS: Event[] = [
  { id: '11111111-0000-0000-0000-000000000001', name: 'PNC 2025', type: 'PNC', year: 2025, start_date: '2025-06-20', end_date: '2025-06-29', venue: 'Bangkok, Thailand', region: 'APAC', status: 'completed' },
  { id: '11111111-0000-0000-0000-000000000002', name: 'PGC 2025', type: 'PGC', year: 2025, start_date: '2025-11-14', end_date: '2025-11-23', venue: 'TBD', region: 'Global', status: 'upcoming' },
  { id: '11111111-0000-0000-0000-000000000003', name: 'PGS Blue 2025', type: 'PGS', year: 2025, start_date: '2025-03-10', end_date: '2025-03-16', venue: 'Seoul, Korea', region: 'APAC', status: 'completed' },
  { id: '11111111-0000-0000-0000-000000000004', name: 'PNC 2026', type: 'PNC', year: 2026, start_date: '2026-06-15', end_date: '2026-06-24', venue: 'TBD', region: 'APAC', status: 'upcoming' },
]

export const MOCK_KPI_TARGETS: Record<string, KpiTarget[]> = {
  '11111111-0000-0000-0000-000000000001': [
    { id: 't1', event_id: '11111111-0000-0000-0000-000000000001', category: 'viewership', metric: 'peak_ccv',         target_value: 500000,   unit: '명' },
    { id: 't2', event_id: '11111111-0000-0000-0000-000000000001', category: 'viewership', metric: 'hours_watched',    target_value: 4000000,  unit: '시간' },
    { id: 't3', event_id: '11111111-0000-0000-0000-000000000001', category: 'viewership', metric: 'unique_viewers',   target_value: 2000000,  unit: '명' },
    { id: 't4', event_id: '11111111-0000-0000-0000-000000000001', category: 'social',     metric: 'impressions',      target_value: 10000000, unit: '회' },
    { id: 't5', event_id: '11111111-0000-0000-0000-000000000001', category: 'social',     metric: 'engagements',      target_value: 500000,   unit: '회' },
    { id: 't6', event_id: '11111111-0000-0000-0000-000000000001', category: 'live_event', metric: 'total_attendance', target_value: 8000,     unit: '명' },
    { id: 't7', event_id: '11111111-0000-0000-0000-000000000001', category: 'competitive',metric: 'team_count',       target_value: 16,       unit: '팀' },
    { id: 't8', event_id: '11111111-0000-0000-0000-000000000001', category: 'competitive',metric: 'country_count',    target_value: 16,       unit: '개국' },
  ],
  '11111111-0000-0000-0000-000000000003': [
    { id: 't9',  event_id: '11111111-0000-0000-0000-000000000003', category: 'viewership', metric: 'peak_ccv',      target_value: 300000,  unit: '명' },
    { id: 't10', event_id: '11111111-0000-0000-0000-000000000003', category: 'viewership', metric: 'hours_watched', target_value: 2000000, unit: '시간' },
    { id: 't11', event_id: '11111111-0000-0000-0000-000000000003', category: 'social',     metric: 'impressions',   target_value: 5000000, unit: '회' },
  ],
}

export const MOCK_VIEWERSHIP: Record<string, ViewershipKpi[]> = {
  '11111111-0000-0000-0000-000000000001': [
    { id: 'v1', event_id: '11111111-0000-0000-0000-000000000001', platform: 'total',   peak_ccv: 423000, acv: 187000, hours_watched: 3712000, unique_viewers: 1840000, hours_broadcast: 90,  recorded_at: '2025-06-29T12:00:00Z' },
    { id: 'v2', event_id: '11111111-0000-0000-0000-000000000001', platform: 'twitch',  peak_ccv: 210000, acv: 95000,  hours_watched: 1820000, unique_viewers: 950000,  hours_broadcast: 90,  recorded_at: '2025-06-29T12:00:00Z' },
    { id: 'v3', event_id: '11111111-0000-0000-0000-000000000001', platform: 'youtube', peak_ccv: 150000, acv: 68000,  hours_watched: 1380000, unique_viewers: 720000,  hours_broadcast: 90,  recorded_at: '2025-06-29T12:00:00Z' },
    { id: 'v4', event_id: '11111111-0000-0000-0000-000000000001', platform: 'sooptv', peak_ccv: 63000,  acv: 24000,  hours_watched: 512000,  unique_viewers: 170000,  hours_broadcast: 90,  recorded_at: '2025-06-29T12:00:00Z' },
  ],
  '11111111-0000-0000-0000-000000000003': [
    { id: 'v5', event_id: '11111111-0000-0000-0000-000000000003', platform: 'total',   peak_ccv: 318000, acv: 142000, hours_watched: 2240000, unique_viewers: 1120000, hours_broadcast: 42,  recorded_at: '2025-03-16T12:00:00Z' },
    { id: 'v6', event_id: '11111111-0000-0000-0000-000000000003', platform: 'twitch',  peak_ccv: 168000, acv: 78000,  hours_watched: 1180000, unique_viewers: 620000,  hours_broadcast: 42,  recorded_at: '2025-03-16T12:00:00Z' },
    { id: 'v7', event_id: '11111111-0000-0000-0000-000000000003', platform: 'youtube', peak_ccv: 102000, acv: 46000,  hours_watched: 820000,  unique_viewers: 380000,  hours_broadcast: 42,  recorded_at: '2025-03-16T12:00:00Z' },
    { id: 'v8', event_id: '11111111-0000-0000-0000-000000000003', platform: 'sooptv', peak_ccv: 48000,  acv: 18000,  hours_watched: 240000,  unique_viewers: 120000,  hours_broadcast: 42,  recorded_at: '2025-03-16T12:00:00Z' },
  ],
}

export const MOCK_SOCIAL: Record<string, SocialKpi[]> = {
  '11111111-0000-0000-0000-000000000001': [
    { id: 's1', event_id: '11111111-0000-0000-0000-000000000001', platform: 'x',         impressions: 3200000, engagements: 148000, video_views: 980000,  follower_delta: 12400, recorded_at: '2025-06-29T12:00:00Z' },
    { id: 's2', event_id: '11111111-0000-0000-0000-000000000001', platform: 'instagram',  impressions: 2800000, engagements: 215000, video_views: 740000,  follower_delta: 18900, recorded_at: '2025-06-29T12:00:00Z' },
    { id: 's3', event_id: '11111111-0000-0000-0000-000000000001', platform: 'youtube',    impressions: 2100000, engagements: 94000,  video_views: 1820000, follower_delta: 8700,  recorded_at: '2025-06-29T12:00:00Z' },
    { id: 's4', event_id: '11111111-0000-0000-0000-000000000001', platform: 'facebook',   impressions: 1400000, engagements: 62000,  video_views: 430000,  follower_delta: 3200,  recorded_at: '2025-06-29T12:00:00Z' },
    { id: 's5', event_id: '11111111-0000-0000-0000-000000000001', platform: 'tiktok',     impressions: 1900000, engagements: 174000, video_views: 2100000, follower_delta: 22100, recorded_at: '2025-06-29T12:00:00Z' },
  ],
  '11111111-0000-0000-0000-000000000003': [
    { id: 's6', event_id: '11111111-0000-0000-0000-000000000003', platform: 'x',         impressions: 1800000, engagements: 92000,  video_views: 540000,  follower_delta: 7200,  recorded_at: '2025-03-16T12:00:00Z' },
    { id: 's7', event_id: '11111111-0000-0000-0000-000000000003', platform: 'instagram',  impressions: 1500000, engagements: 134000, video_views: 420000,  follower_delta: 11200, recorded_at: '2025-03-16T12:00:00Z' },
    { id: 's8', event_id: '11111111-0000-0000-0000-000000000003', platform: 'youtube',    impressions: 1200000, engagements: 58000,  video_views: 980000,  follower_delta: 5100,  recorded_at: '2025-03-16T12:00:00Z' },
    { id: 's9', event_id: '11111111-0000-0000-0000-000000000003', platform: 'facebook',   impressions: 820000,  engagements: 38000,  video_views: 240000,  follower_delta: 1800,  recorded_at: '2025-03-16T12:00:00Z' },
    { id: 's10',event_id: '11111111-0000-0000-0000-000000000003', platform: 'tiktok',     impressions: 1100000, engagements: 98000,  video_views: 1240000, follower_delta: 14300, recorded_at: '2025-03-16T12:00:00Z' },
  ],
}

export const MOCK_BROADCAST: Record<string, BroadcastKpi> = {
  '11111111-0000-0000-0000-000000000001': { id: 'b1', event_id: '11111111-0000-0000-0000-000000000001', channel_count: 18, co_streamer_count: 42, co_streamer_viewers: 280000, coverage_regions: 12, clip_views: 4200000, recorded_at: '2025-06-29T12:00:00Z' },
  '11111111-0000-0000-0000-000000000003': { id: 'b2', event_id: '11111111-0000-0000-0000-000000000003', channel_count: 12, co_streamer_count: 28, co_streamer_viewers: 160000, coverage_regions: 8,  clip_views: 2400000, recorded_at: '2025-03-16T12:00:00Z' },
}

export const MOCK_COMPETITIVE: Record<string, CompetitiveKpi> = {
  '11111111-0000-0000-0000-000000000001': { id: 'c1', event_id: '11111111-0000-0000-0000-000000000001', team_count: 16, player_count: 64, country_count: 16, prize_pool_usd: 500000, recorded_at: '2025-06-29T12:00:00Z' },
  '11111111-0000-0000-0000-000000000003': { id: 'c2', event_id: '11111111-0000-0000-0000-000000000003', team_count: 16, player_count: 64, country_count: 12, prize_pool_usd: 200000, recorded_at: '2025-03-16T12:00:00Z' },
}

export const MOCK_LIVE_EVENT: Record<string, LiveEventKpi> = {
  '11111111-0000-0000-0000-000000000001': { id: 'le1', event_id: '11111111-0000-0000-0000-000000000001', total_attendance: 7420, ticket_sales_rate: 0.928, avg_occupancy: 0.895, recorded_at: '2025-06-29T12:00:00Z' },
}

// ─── 언어별 CCV 분포 ────────────────────────────────────────────────────────
export type Language = 'EN' | 'KR' | 'ZH' | 'JA' | 'Other'

export interface CcvByLanguageRow {
  language: Language
  twitch: number
  youtube: number
  afreeca: number
}

export const MOCK_CCV_BY_LANGUAGE: Record<string, CcvByLanguageRow[]> = {
  '11111111-0000-0000-0000-000000000001': [
    { language: 'EN',    twitch: 120000, youtube: 95000, afreeca: 0     },
    { language: 'KR',    twitch: 42000,  youtube: 28000, afreeca: 85000 },
    { language: 'ZH',    twitch: 18000,  youtube: 32000, afreeca: 0     },
    { language: 'JA',    twitch: 15000,  youtube: 28000, afreeca: 0     },
    { language: 'Other', twitch: 15000,  youtube: 17000, afreeca: 0     },
  ],
  '11111111-0000-0000-0000-000000000003': [
    { language: 'EN',    twitch: 90000,  youtube: 72000, afreeca: 0     },
    { language: 'KR',    twitch: 38000,  youtube: 22000, afreeca: 68000 },
    { language: 'ZH',    twitch: 12000,  youtube: 18000, afreeca: 0     },
    { language: 'JA',    twitch: 10000,  youtube: 14000, afreeca: 0     },
    { language: 'Other', twitch: 8000,   youtube: 6000,  afreeca: 0     },
  ],
}

// ─── 언어별 소셜 성과 ────────────────────────────────────────────────────────
export interface SocialByLanguageRow {
  language: Language
  impressions: number
  engagements: number
  content_count: number
}

export const MOCK_SOCIAL_BY_LANGUAGE: Record<string, SocialByLanguageRow[]> = {
  '11111111-0000-0000-0000-000000000001': [
    { language: 'EN',    impressions: 4600000, engagements: 310000, content_count: 92 },
    { language: 'KR',    impressions: 2700000, engagements: 198000, content_count: 45 },
    { language: 'ZH',    impressions: 1500000, engagements: 104000, content_count: 35 },
    { language: 'JA',    impressions: 1000000, engagements: 72000,  content_count: 28 },
    { language: 'Other', impressions: 1600000, engagements: 109000, content_count: 22 },
  ],
  '11111111-0000-0000-0000-000000000003': [
    { language: 'EN',    impressions: 2800000, engagements: 192000, content_count: 58 },
    { language: 'KR',    impressions: 1420000, engagements: 116000, content_count: 32 },
    { language: 'ZH',    impressions: 700000,  engagements: 50000,  content_count: 20 },
    { language: 'JA',    impressions: 500000,  engagements: 36000,  content_count: 18 },
    { language: 'Other', impressions: 720000,  engagements: 54000,  content_count: 15 },
  ],
}

export const MOCK_REPORTS: ReportHistory[] = [
  { id: 'r1', title: 'PNC 2025 이벤트 결과 보고서', type: 'event_result', event_ids: ['11111111-0000-0000-0000-000000000001'], created_by: 'admin@krafton.com', file_url: null as unknown as string, created_at: '2025-07-02T09:00:00Z' },
  { id: 'r2', title: 'PGS Blue 2025 이벤트 결과 보고서', type: 'event_result', event_ids: ['11111111-0000-0000-0000-000000000003'], created_by: 'admin@krafton.com', file_url: null as unknown as string, created_at: '2025-03-20T09:00:00Z' },
  { id: 'r3', title: '주간 실적 요약 — 2025.06.23', type: 'weekly', event_ids: ['11111111-0000-0000-0000-000000000001'], created_by: 'cron', file_url: null as unknown as string, created_at: '2025-06-23T00:00:00Z' },
]
