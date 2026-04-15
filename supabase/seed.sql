-- ============================================================
-- seed.sql — PNC 2025 샘플 데이터
-- ============================================================

-- 이벤트
INSERT INTO events (id, name, type, year, start_date, end_date, venue, region, status) VALUES
  ('11111111-0000-0000-0000-000000000001', 'PNC 2025', 'PNC', 2025, '2025-06-20', '2025-06-29', 'Bangkok, Thailand', 'APAC', 'completed'),
  ('11111111-0000-0000-0000-000000000002', 'PGC 2025', 'PGC', 2025, '2025-11-14', '2025-11-23', 'TBD', 'Global', 'upcoming'),
  ('11111111-0000-0000-0000-000000000003', 'PGS Blue 2025', 'PGS', 2025, '2025-03-10', '2025-03-16', 'Seoul, Korea', 'APAC', 'completed'),
  ('11111111-0000-0000-0000-000000000004', 'PNC 2026', 'PNC', 2026, '2026-06-15', '2026-06-24', 'TBD', 'APAC', 'upcoming');

-- KPI 목표값 (PNC 2025)
INSERT INTO kpi_targets (event_id, category, metric, target_value, unit) VALUES
  ('11111111-0000-0000-0000-000000000001', 'viewership', 'peak_ccv',       500000, '명'),
  ('11111111-0000-0000-0000-000000000001', 'viewership', 'hours_watched',  4000000, '시간'),
  ('11111111-0000-0000-0000-000000000001', 'viewership', 'unique_viewers', 2000000, '명'),
  ('11111111-0000-0000-0000-000000000001', 'social',     'impressions',    10000000, '회'),
  ('11111111-0000-0000-0000-000000000001', 'social',     'engagements',    500000, '회'),
  ('11111111-0000-0000-0000-000000000001', 'live_event', 'total_attendance', 8000, '명'),
  ('11111111-0000-0000-0000-000000000001', 'live_event', 'ticket_sales_rate', 0.90, '%'),
  ('11111111-0000-0000-0000-000000000001', 'competitive', 'team_count',    16, '팀'),
  ('11111111-0000-0000-0000-000000000001', 'competitive', 'country_count', 16, '개국');

-- 뷰어십 KPI (PNC 2025 최종값)
INSERT INTO viewership_kpis (event_id, platform, peak_ccv, acv, hours_watched, unique_viewers, hours_broadcast) VALUES
  ('11111111-0000-0000-0000-000000000001', 'total',   423000, 187000, 3712000, 1840000, 90),
  ('11111111-0000-0000-0000-000000000001', 'twitch',  210000, 95000,  1820000, 950000,  90),
  ('11111111-0000-0000-0000-000000000001', 'youtube', 150000, 68000,  1380000, 720000,  90),
  ('11111111-0000-0000-0000-000000000001', 'afreeca', 63000,  24000,  512000,  170000,  90);

-- 소셜 KPI (PNC 2025)
INSERT INTO social_kpis (event_id, platform, impressions, engagements, video_views, follower_delta) VALUES
  ('11111111-0000-0000-0000-000000000001', 'x',         3200000, 148000, 980000,  12400),
  ('11111111-0000-0000-0000-000000000001', 'instagram', 2800000, 215000, 740000,  18900),
  ('11111111-0000-0000-0000-000000000001', 'youtube',   2100000, 94000,  1820000, 8700),
  ('11111111-0000-0000-0000-000000000001', 'facebook',  1400000, 62000,  430000,  3200),
  ('11111111-0000-0000-0000-000000000001', 'tiktok',    1900000, 174000, 2100000, 22100);

-- 방송 KPI (PNC 2025)
INSERT INTO broadcast_kpis (event_id, channel_count, co_streamer_count, co_streamer_viewers, coverage_regions, clip_views) VALUES
  ('11111111-0000-0000-0000-000000000001', 18, 42, 280000, 12, 4200000);

-- 경쟁 KPI (PNC 2025)
INSERT INTO competitive_kpis (event_id, team_count, player_count, country_count, prize_pool_usd) VALUES
  ('11111111-0000-0000-0000-000000000001', 16, 64, 16, 500000);

-- 현장 KPI (PNC 2025)
INSERT INTO live_event_kpis (event_id, total_attendance, ticket_sales_rate, avg_occupancy) VALUES
  ('11111111-0000-0000-0000-000000000001', 7420, 0.928, 0.895);

-- KPI 목표값 (PGS Blue 2025)
INSERT INTO kpi_targets (event_id, category, metric, target_value, unit) VALUES
  ('11111111-0000-0000-0000-000000000003', 'viewership', 'peak_ccv',       300000, '명'),
  ('11111111-0000-0000-0000-000000000003', 'viewership', 'hours_watched',  2000000, '시간'),
  ('11111111-0000-0000-0000-000000000003', 'social',     'impressions',    5000000, '회');

-- 뷰어십 KPI (PGS Blue 2025)
INSERT INTO viewership_kpis (event_id, platform, peak_ccv, acv, hours_watched, unique_viewers, hours_broadcast) VALUES
  ('11111111-0000-0000-0000-000000000003', 'total',   318000, 142000, 2240000, 1120000, 42),
  ('11111111-0000-0000-0000-000000000003', 'twitch',  168000, 78000,  1180000, 620000,  42),
  ('11111111-0000-0000-0000-000000000003', 'youtube', 102000, 46000,  820000,  380000,  42),
  ('11111111-0000-0000-0000-000000000003', 'afreeca', 48000,  18000,  240000,  120000,  42);
