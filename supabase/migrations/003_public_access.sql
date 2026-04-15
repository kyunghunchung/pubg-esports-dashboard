-- ============================================================
-- 003_public_access.sql
-- 정적 배포(GitHub Pages)용 공개 접근 허용
-- anon 키로 읽기·쓰기 모두 허용 (내부 전용 도구)
-- ============================================================

-- 기존 제한적 정책 제거
DROP POLICY IF EXISTS "events_read"          ON events;
DROP POLICY IF EXISTS "events_write"         ON events;
DROP POLICY IF EXISTS "kpi_targets_read"     ON kpi_targets;
DROP POLICY IF EXISTS "kpi_targets_write"    ON kpi_targets;
DROP POLICY IF EXISTS "viewership_kpis_read" ON viewership_kpis;
DROP POLICY IF EXISTS "viewership_kpis_write" ON viewership_kpis;
DROP POLICY IF EXISTS "social_kpis_read"     ON social_kpis;
DROP POLICY IF EXISTS "social_kpis_write"    ON social_kpis;
DROP POLICY IF EXISTS "broadcast_kpis_read"  ON broadcast_kpis;
DROP POLICY IF EXISTS "broadcast_kpis_write" ON broadcast_kpis;
DROP POLICY IF EXISTS "competitive_kpis_read"  ON competitive_kpis;
DROP POLICY IF EXISTS "competitive_kpis_write" ON competitive_kpis;
DROP POLICY IF EXISTS "live_event_kpis_read"   ON live_event_kpis;
DROP POLICY IF EXISTS "live_event_kpis_write"  ON live_event_kpis;
DROP POLICY IF EXISTS "report_history_read"    ON report_history;
DROP POLICY IF EXISTS "report_history_insert"  ON report_history;
DROP POLICY IF EXISTS "report_history_delete"  ON report_history;

-- 모든 테이블 공개 읽기·쓰기
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'events','kpi_targets',
    'viewership_kpis','social_kpis','broadcast_kpis',
    'competitive_kpis','live_event_kpis','report_history'
  ]
  LOOP
    EXECUTE format('CREATE POLICY "public_read"  ON %I FOR SELECT USING (true);', tbl);
    EXECUTE format('CREATE POLICY "public_write" ON %I FOR ALL   USING (true) WITH CHECK (true);', tbl);
  END LOOP;
END $$;

-- events 테이블에 (name, year) UNIQUE 제약 추가 (upsert 지원)
ALTER TABLE events
  ADD CONSTRAINT events_name_year_unique UNIQUE (name, year);
