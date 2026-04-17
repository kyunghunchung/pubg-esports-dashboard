// ============================================================
// lib/config/event-master.ts
// 이벤트 마스터 테이블 — 대시보드 내 모든 이벤트 식별의 단일 소스
//
// 운영 규칙:
//   1. 신규 대회 추가 시 EVENT_MASTER 배열에만 항목 추가 후 배포
//   2. event_id 는 한번 확정되면 절대 변경 금지
//   3. 대회 취소·변경 시 삭제 금지 → is_global: false 처리
// ============================================================

export interface EventMasterEntry {
  event_id:     string   // 시스템 식별 키 (영문·숫자·언더스코어, 예: PNC_2025)
  display_name: string   // 화면 표시 이름 (예: PNC 2025)
  year:         number   // 개최 연도
  is_global:    boolean  // true → /dashboard 이벤트 버튼에 표시
  sort_order:   number   // 같은 연도 내 버튼 정렬 순서
}

export const EVENT_MASTER: EventMasterEntry[] = [
  // ── 2025 ───────────────────────────────────────────────────────
  { event_id: 'PNC_2025',  display_name: 'PNC 2025',  year: 2025, is_global: true,  sort_order: 1 },
  { event_id: 'PGS1_2025', display_name: 'PGS1 2025', year: 2025, is_global: true,  sort_order: 2 },
  { event_id: 'EWC_2025',  display_name: 'EWC 2025',  year: 2025, is_global: true,  sort_order: 3 },
  { event_id: 'PGC_2025',  display_name: 'PGC 2025',  year: 2025, is_global: true,  sort_order: 4 },
  { event_id: 'ENC_2025',  display_name: 'ENC 2025',  year: 2025, is_global: false, sort_order: 5 },
  // ── 2024 ───────────────────────────────────────────────────────
  { event_id: 'PGS3_2024', display_name: 'PGS3 2024', year: 2024, is_global: true,  sort_order: 1 },
  { event_id: 'PGS4_2024', display_name: 'PGS4 2024', year: 2024, is_global: true,  sort_order: 2 },
  { event_id: 'EWC_2024',  display_name: 'EWC 2024',  year: 2024, is_global: true,  sort_order: 3 },
  { event_id: 'PNC_2024',  display_name: 'PNC 2024',  year: 2024, is_global: true,  sort_order: 4 },
  { event_id: 'PGC_2024',  display_name: 'PGC 2024',  year: 2024, is_global: true,  sort_order: 5 },
  // ── 2023 ───────────────────────────────────────────────────────
  { event_id: 'PGS1_2023', display_name: 'PGS1 2023', year: 2023, is_global: true,  sort_order: 1 },
  { event_id: 'PGS2_2023', display_name: 'PGS2 2023', year: 2023, is_global: true,  sort_order: 2 },
  { event_id: 'PNC_2023',  display_name: 'PNC 2023',  year: 2023, is_global: true,  sort_order: 3 },
  { event_id: 'PGC_2023',  display_name: 'PGC 2023',  year: 2023, is_global: true,  sort_order: 4 },
]

/** event_id → EventMasterEntry. 없으면 undefined */
export function getEventMasterById(id: string): EventMasterEntry | undefined {
  return EVENT_MASTER.find(e => e.event_id === id)
}

/** event_id → 화면 표시명. 없으면 event_id 그대로 반환 */
export function getDisplayName(event_id: string): string {
  return EVENT_MASTER.find(e => e.event_id === event_id)?.display_name ?? event_id
}

/** EVENT_MASTER 에 등록된 연도 목록 (내림차순) */
export function getAllYears(): number[] {
  return Array.from(new Set(EVENT_MASTER.map(e => e.year))).sort((a, b) => b - a)
}

/** 해당 연도의 전체 이벤트 (sort_order 오름차순) */
export function getEventsByYear(year: number): EventMasterEntry[] {
  return EVENT_MASTER.filter(e => e.year === year).sort((a, b) => a.sort_order - b.sort_order)
}

/** 해당 연도의 글로벌 이벤트만 (sort_order 오름차순) */
export function getGlobalEventsByYear(year: number): EventMasterEntry[] {
  return getEventsByYear(year).filter(e => e.is_global)
}

/** event_id 입력값 정규화: 공백 제거 (예: "PGS 1_2023" → "PGS1_2023") */
export function normalizeEventId(raw: string): string {
  return raw.replace(/\s+/g, '')
}

/** 업로드 파일의 event_id 문자열 검증. 실패 시 오류 메시지 반환 */
export function validateEventId(raw: string): string | null {
  if (!raw) return 'event_id 값이 비어 있습니다.'
  const normalized = normalizeEventId(raw)
  if (!getEventMasterById(normalized)) {
    const valid = EVENT_MASTER.map(e => e.event_id).join(', ')
    return `등록되지 않은 이벤트입니다: "${raw}"\n유효한 event_id: ${valid}`
  }
  return null
}
