-- ============================================================
-- 005_schema_fix.sql
-- 누락 컬럼 추가 및 CHECK 제약 정비 (idempotent — 여러 번 실행 가능)
-- Supabase SQL Editor에서 전체 복사 후 실행하세요.
-- ============================================================

-- ── 1. events: UNIQUE 제약 (upsert 필수) ─────────────────────
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_name_year_unique;
ALTER TABLE events
  ADD CONSTRAINT events_name_year_unique UNIQUE (name, year);

-- ── 2. events.type CHECK ─────────────────────────────────────
-- PNC / PGC / PGS / EWC / PMI / ENC / Regional
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;
ALTER TABLE events ADD CONSTRAINT events_type_check
  CHECK (type IN ('PNC','PGC','PGS','EWC','PMI','ENC','Regional'));

-- ── 3. viewership_kpis.platform CHECK ────────────────────────
-- Twitch / YouTube / SoopTV / 치지직 / Kick / NimoTV / total
ALTER TABLE viewership_kpis DROP CONSTRAINT IF EXISTS viewership_kpis_platform_check;
ALTER TABLE viewership_kpis ADD CONSTRAINT viewership_kpis_platform_check
  CHECK (platform IN ('twitch','youtube','sooptv','chzzk','kick','nimotv','total'));

-- ── 4. social_kpis: 콘텐츠 상세 컬럼 추가 ───────────────────
ALTER TABLE social_kpis
  ADD COLUMN IF NOT EXISTS content_count   INT,
  ADD COLUMN IF NOT EXISTS region          TEXT,
  ADD COLUMN IF NOT EXISTS content_type_1  TEXT,
  ADD COLUMN IF NOT EXISTS content_type_2  TEXT;

-- ── 5. broadcast_kpis: 코스트리밍 상세 컬럼 추가 ─────────────
ALTER TABLE broadcast_kpis
  ADD COLUMN IF NOT EXISTS region    TEXT,
  ADD COLUMN IF NOT EXISTS acv       BIGINT,
  ADD COLUMN IF NOT EXISTS cost_usd  NUMERIC;

-- ── 확인 쿼리 (실행 후 결과로 검증) ─────────────────────────
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('events','viewership_kpis','social_kpis','broadcast_kpis')
  AND column_name IN (
    'type','region','content_count','content_type_1','content_type_2',
    'acv','cost_usd'
  )
ORDER BY table_name, column_name;
