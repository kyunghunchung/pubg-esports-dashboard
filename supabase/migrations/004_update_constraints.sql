-- ============================================================
-- 004_update_constraints.sql
-- 이벤트 유형·뷰어십 플랫폼 CHECK 제약 업데이트
-- 신규 대회 유형(PMI, Regional) 및 플랫폼(SoopTV, 치지직, Kick, NimoTV) 추가
-- ============================================================

-- ── events.type ─────────────────────────────────────────────
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;
ALTER TABLE events ADD CONSTRAINT events_type_check
  CHECK (type IN ('PNC','PGC','PGS','EWC','PMI','Regional'));

-- ── viewership_kpis.platform ────────────────────────────────
ALTER TABLE viewership_kpis DROP CONSTRAINT IF EXISTS viewership_kpis_platform_check;
ALTER TABLE viewership_kpis ADD CONSTRAINT viewership_kpis_platform_check
  CHECK (platform IN ('twitch','youtube','sooptv','chzzk','kick','nimotv','total'));
