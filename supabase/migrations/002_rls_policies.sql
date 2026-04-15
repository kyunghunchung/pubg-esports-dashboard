-- ============================================================
-- 002_rls_policies.sql
-- RLS 활성화 및 정책 설정
-- ============================================================

-- RLS 활성화
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_targets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewership_kpis  ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_kpis      ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_kpis   ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_event_kpis  ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_history   ENABLE ROW LEVEL SECURITY;

-- ── 인증 도우미 함수 ─────────────────────────────────────────
-- JWT의 app_metadata.role 필드를 읽어 권한 체크
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
    'viewer'
  );
$$ LANGUAGE sql STABLE;

-- ── events ──────────────────────────────────────────────────
-- 인증된 사용자 전체 READ
CREATE POLICY "events_read" ON events
  FOR SELECT USING (auth.role() = 'authenticated');

-- editor / admin만 INSERT·UPDATE·DELETE
CREATE POLICY "events_write" ON events
  FOR ALL USING (auth_role() IN ('editor','admin'))
  WITH CHECK (auth_role() IN ('editor','admin'));

-- ── kpi_targets ─────────────────────────────────────────────
CREATE POLICY "kpi_targets_read" ON kpi_targets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "kpi_targets_write" ON kpi_targets
  FOR ALL USING (auth_role() IN ('editor','admin'))
  WITH CHECK (auth_role() IN ('editor','admin'));

-- ── KPI 테이블 공통 (인증 사용자 전체 READ, editor+ 이상 WRITE) ──
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['viewership_kpis','social_kpis','broadcast_kpis','competitive_kpis','live_event_kpis']
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (auth.role() = ''authenticated'');',
      tbl || '_read', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (auth_role() IN (''editor'',''admin'')) WITH CHECK (auth_role() IN (''editor'',''admin''));',
      tbl || '_write', tbl
    );
  END LOOP;
END $$;

-- ── report_history ───────────────────────────────────────────
CREATE POLICY "report_history_read" ON report_history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "report_history_insert" ON report_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "report_history_delete" ON report_history
  FOR DELETE USING (auth_role() IN ('editor','admin'));
