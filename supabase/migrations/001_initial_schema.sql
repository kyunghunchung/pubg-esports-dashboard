-- ============================================================
-- 001_initial_schema.sql
-- PUBG Esports 실적 모니터링 대시보드 초기 스키마
-- ============================================================

-- 이벤트 마스터
CREATE TABLE events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('PNC','PGC','PGS','GOTF','EWC','ENC')),
  year         INT NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  venue        TEXT,
  region       TEXT,
  status       TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','completed')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- KPI 목표값
CREATE TABLE kpi_targets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category     TEXT NOT NULL CHECK (category IN ('viewership','social','broadcast','competitive','live_event')),
  metric       TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  unit         TEXT,
  UNIQUE (event_id, category, metric)
);

-- 뷰어십 KPI
CREATE TABLE viewership_kpis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL CHECK (platform IN ('twitch','youtube','afreeca','total')),
  peak_ccv        BIGINT,
  acv             BIGINT,
  hours_watched   NUMERIC,
  unique_viewers  BIGINT,
  hours_broadcast NUMERIC,
  recorded_at     TIMESTAMPTZ DEFAULT now()
);

-- 소셜 KPI
CREATE TABLE social_kpis (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  platform       TEXT NOT NULL CHECK (platform IN ('x','instagram','facebook','tiktok','youtube')),
  impressions    BIGINT DEFAULT 0,
  engagements    BIGINT DEFAULT 0,
  video_views    BIGINT DEFAULT 0,
  follower_delta INT DEFAULT 0,
  recorded_at    TIMESTAMPTZ DEFAULT now()
);

-- 방송 KPI
CREATE TABLE broadcast_kpis (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  channel_count       INT,
  co_streamer_count   INT,
  co_streamer_viewers BIGINT,
  coverage_regions    INT,
  clip_views          BIGINT,
  recorded_at         TIMESTAMPTZ DEFAULT now()
);

-- 경쟁 KPI
CREATE TABLE competitive_kpis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_count      INT,
  player_count    INT,
  country_count   INT,
  prize_pool_usd  NUMERIC,
  recorded_at     TIMESTAMPTZ DEFAULT now()
);

-- 현장 KPI
CREATE TABLE live_event_kpis (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  total_attendance   INT,
  ticket_sales_rate  NUMERIC CHECK (ticket_sales_rate BETWEEN 0 AND 1),
  avg_occupancy      NUMERIC CHECK (avg_occupancy BETWEEN 0 AND 1),
  recorded_at        TIMESTAMPTZ DEFAULT now()
);

-- 리포트 히스토리
CREATE TABLE report_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('event_result','weekly','annual')),
  event_ids   UUID[],
  created_by  TEXT,
  file_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_viewership_event_id ON viewership_kpis(event_id);
CREATE INDEX idx_viewership_recorded_at ON viewership_kpis(recorded_at DESC);
CREATE INDEX idx_social_event_id ON social_kpis(event_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_year ON events(year);
