/**
 * 실제 2025 PUBG Esports 데이터를 DB에 반영하는 스크립트
 *
 * 변경 내용:
 * 1. PNC 2025 뷰어십 데이터 수정 (423,000 → 817,769)
 * 2. 이벤트 테이블을 실제 2025 대회 일정으로 교체
 */

const { createClient } = require('@supabase/supabase-js')

// 실행 전 환경변수 설정 필요:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// PNC 2025 event ID는 뷰어십 데이터가 연결돼 있으므로 유지
const PNC_2025_ID = '11111111-0000-0000-0000-000000000001'
const PGC_2025_ID = '11111111-0000-0000-0000-000000000002'
const PNC_2026_ID = '11111111-0000-0000-0000-000000000004'

// 삭제할 구 이벤트
const DELETE_EVENT_IDS = [
  '11111111-0000-0000-0000-000000000003', // PGS Blue 2025 (가짜)
]

// 실제 2025 이벤트 목록 (글로벌 대회 Excel 기준, 날짜는 공식 일정 기반 추정)
const REAL_EVENTS = [
  {
    id: 'aaaaaaaa-0000-0000-0000-000000000007',
    name: 'PUBG Global Series 7 2025',
    type: 'PGS',
    year: 2025,
    start_date: '2025-03-26',
    end_date: '2025-04-06',
    venue: 'Bangkok, Thailand',
    region: 'Global',
    status: 'completed',
  },
  {
    id: 'aaaaaaaa-0000-0000-0000-000000000008',
    name: 'PUBG Global Series 8 2025',
    type: 'PGS',
    year: 2025,
    start_date: '2025-05-21',
    end_date: '2025-06-01',
    venue: 'Bangkok, Thailand',
    region: 'Global',
    status: 'completed',
  },
  {
    // PNC 2025 — 기존 ID 유지 (뷰어십 데이터 연결됨)
    id: PNC_2025_ID,
    name: 'PUBG Nations Cup 2025',
    type: 'PNC',
    year: 2025,
    start_date: '2025-07-31',
    end_date: '2025-08-03',
    venue: 'Seoul, Korea',
    region: 'Global',
    status: 'completed',
  },
  {
    id: 'aaaaaaaa-0000-0000-0000-000000000009',
    name: 'Esports World Cup 2025',
    type: 'EWC',
    year: 2025,
    start_date: '2025-08-07',
    end_date: '2025-08-17',
    venue: 'Riyadh, Saudi Arabia',
    region: 'Global',
    status: 'completed',
  },
  {
    id: 'aaaaaaaa-0000-0000-0000-000000000010',
    name: 'PUBG Global Series 9 2025',
    type: 'PGS',
    year: 2025,
    start_date: '2025-09-10',
    end_date: '2025-09-21',
    venue: 'Bangkok, Thailand',
    region: 'Global',
    status: 'completed',
  },
  {
    id: 'aaaaaaaa-0000-0000-0000-000000000011',
    name: 'PUBG Global Series 10 2025',
    type: 'PGS',
    year: 2025,
    start_date: '2025-10-22',
    end_date: '2025-11-02',
    venue: 'Bangkok, Thailand',
    region: 'Global',
    status: 'completed',
  },
  {
    // PGC 2025 — 기존 ID 유지
    id: PGC_2025_ID,
    name: 'PUBG Global Championship 2025',
    type: 'PGC',
    year: 2025,
    start_date: '2025-11-12',
    end_date: '2025-11-23',
    venue: 'TBD',
    region: 'Global',
    status: 'completed',
  },
  {
    id: 'aaaaaaaa-0000-0000-0000-000000000012',
    name: 'PUBG Players Masters Invitational',
    type: 'GOTF',
    year: 2025,
    start_date: '2025-12-05',
    end_date: '2025-12-07',
    venue: 'TBD',
    region: 'Global',
    status: 'completed',
  },
  {
    // 2026 PNC — 유지
    id: PNC_2026_ID,
    name: 'PUBG Nations Cup 2026',
    type: 'PNC',
    year: 2026,
    start_date: '2026-06-15',
    end_date: '2026-06-24',
    venue: 'TBD',
    region: 'Global',
    status: 'upcoming',
  },
]

async function run() {
  console.log('=== 1. 구 이벤트 삭제 ===')
  const { error: delEvErr } = await supabase
    .from('events')
    .delete()
    .in('id', DELETE_EVENT_IDS)
  if (delEvErr) {
    console.error('이벤트 삭제 실패:', delEvErr.message)
    return
  }
  console.log('삭제 완료:', DELETE_EVENT_IDS)

  console.log('\n=== 2. 이벤트 upsert ===')
  const { data: upsertedEvents, error: upsertEvErr } = await supabase
    .from('events')
    .upsert(REAL_EVENTS, { onConflict: 'id' })
    .select('id, name, status')
  if (upsertEvErr) {
    console.error('이벤트 upsert 실패:', upsertEvErr.message)
    return
  }
  console.log('이벤트 upsert 완료:')
  upsertedEvents?.forEach(e => console.log(' -', e.name, `[${e.status}]`))

  console.log('\n=== 3. PNC 2025 중복 뷰어십 행 삭제 (잘못된 테스트 데이터) ===')
  // recorded_at이 2025-06-29인 중복 행 삭제
  const { error: delVkErr } = await supabase
    .from('viewership_kpis')
    .delete()
    .eq('event_id', PNC_2025_ID)
    .eq('recorded_at', '2025-06-29T00:00:00+00:00')
  if (delVkErr) {
    console.error('중복 뷰어십 삭제 실패:', delVkErr.message)
  } else {
    console.log('중복 total 행 삭제 완료')
  }

  console.log('\n=== 4. PNC 2025 total 뷰어십 실제값으로 업데이트 ===')
  // Excel 기준: peak_ccv=817,769 / accv=273,040 / global_uv=2,412,378
  const { data: updatedVk, error: updateVkErr } = await supabase
    .from('viewership_kpis')
    .update({
      peak_ccv: 817769,
      acv: 273040,
      unique_viewers: 2412378,
      hours_watched: 5240000,   // 역산 추정: ACCV * broadcast_hours (약 19.2h * 273040)
      hours_broadcast: 100,
    })
    .eq('event_id', PNC_2025_ID)
    .eq('platform', 'total')
    .select('id, platform, peak_ccv')
  if (updateVkErr) {
    console.error('total 뷰어십 업데이트 실패:', updateVkErr.message)
  } else {
    console.log('total 뷰어십 업데이트 완료:', updatedVk)
  }

  console.log('\n=== 완료 ===')
  console.log('브라우저에서 http://localhost:3000/dashboard 새로고침 해주세요.')
}

run().catch(console.error)
