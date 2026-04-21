// ============================================================
// lib/config/constants.ts
// 플랫폼·대회 유형 등 데이터 일관성 기준을 여기서 관리합니다.
// 추가/변경 시 이 파일만 수정하면 파서·템플릿·UI에 자동 반영됩니다.
// ============================================================

// ── 통합 플랫폼 목록 ─────────────────────────────────────────
// Viewership / Contents / Co-streaming 전체 공통
// key: DB 저장값 (소문자)  |  label: 화면 표시·엑셀 입력값
export const PLATFORMS = {
  chzzk:              'CHZZK',
  douyin:             'Douyin',
  facebook:           'Facebook',
  instagram:          'Instagram',
  kick:               'Kick',
  nimotv:             'Nimo TV',
  official_community: 'Official Community',
  soop_global:        'SOOP (Global)',
  soop_korea:         'SOOP Korea',
  steam:              'Steam',
  tiktok:             'TikTok',
  trovo:              'Trovo',
  twitch:             'Twitch',
  weibo:              'Weibo',
  x:                  'X (Twitter)',
  youtube:            'YouTube',
} as const

export type PlatformId = keyof typeof PLATFORMS

// ── 뷰어십 플랫폼 (PLATFORMS + total 합산 행) ────────────────
export const VIEWERSHIP_PLATFORMS = {
  ...PLATFORMS,
  total: 'Total',
} as const

export type ViewershipPlatformId = keyof typeof VIEWERSHIP_PLATFORMS

// ── 소셜(콘텐츠) 플랫폼 — 통합 목록과 동일 ──────────────────
export const SOCIAL_PLATFORMS = PLATFORMS
export type SocialPlatformId = PlatformId

// ── 글로벌 대회 유형 ─────────────────────────────────────────
// 이 목록에 있는 유형은 글로벌 집계에 포함됩니다.
export const GLOBAL_EVENT_TYPES = {
  PGS: 'PUBG Global Series',
  PNC: 'PUBG Nations Cup',
  PGC: 'PUBG Global Championship',
  EWC: 'Esports World Cup',
  PMI: 'PUBG Players Masters Invitational',
  ENC: 'Esports Nations Championship',
} as const

export type GlobalEventTypeId = keyof typeof GLOBAL_EVENT_TYPES

// 지역 대회를 포함한 전체 유형
export const ALL_EVENT_TYPES = {
  ...GLOBAL_EVENT_TYPES,
  Regional: '지역 대회',
} as const

export type EventTypeId = keyof typeof ALL_EVENT_TYPES

// ── 최소 집계 연도 ───────────────────────────────────────────
export const MIN_YEAR = 2023

// ── 유틸 함수 ────────────────────────────────────────────────

/** 대회명으로 EventType 추측 */
export function guessEventType(name: string): EventTypeId {
  const u = name.toUpperCase()
  if (u.includes('PGC') || u.includes('GLOBAL CHAMPIONSHIP'))           return 'PGC'
  if (u.includes('PNC') || u.includes('NATIONS CUP'))                   return 'PNC'
  if (u.includes('PGS') || u.includes('GLOBAL SERIES'))                 return 'PGS'
  if (u.includes('EWC') || u.includes('ESPORTS WORLD CUP'))             return 'EWC'
  if (u.includes('ENC') || u.includes('ESPORTS NATIONS'))               return 'ENC'
  if (u.includes('PMI') || u.includes('PLAYERS MASTERS') ||
      u.includes('INVITATIONAL'))                                        return 'PMI'
  return 'Regional'
}

/** 글로벌 대회 여부 */
export function isGlobalEvent(type: EventTypeId): boolean {
  return type in GLOBAL_EVENT_TYPES
}

/**
 * 입력값(표시명 or ID)을 정규화된 플랫폼 ID로 변환.
 * 대소문자·공백 무시. 매칭 실패 시 null 반환.
 */
// 구 명칭 → 현재 플랫폼 ID 별칭
const PLATFORM_ALIASES: Record<string, PlatformId> = {
  // SOOP 리브랜딩 (AfreecaTV → SOOP Korea)
  afreeca:       'soop_korea',
  afreecatv:     'soop_korea',
  'afreeca tv':  'soop_korea',
  sooptv:        'soop_korea',
  soop:          'soop_korea',
  'soop tv':     'soop_korea',
  // Nimo TV 별칭
  nimo:          'nimotv',
  'nimo tv':     'nimotv',
  // CHZZK 한글 표기
  '치지직':        'chzzk',
  // TikTok 대소문자 변형
  'tik tok':     'tiktok',
  // X (Twitter) 별칭
  twitter:       'x',
  'x (twitter)': 'x',
  // Instagram 별칭
  ig:            'instagram',
}

/** 플랫폼 입력값 → 정규화된 PlatformId. 매칭 실패 시 null 반환 */
export function normalizePlatform(input: string): PlatformId | null {
  const lower = input.toLowerCase().trim()
  if (lower in PLATFORMS) return lower as PlatformId
  const byLabel = Object.entries(PLATFORMS).find(([, label]) => label.toLowerCase() === lower)
  if (byLabel) return byLabel[0] as PlatformId
  return PLATFORM_ALIASES[lower] ?? null
}

/** Viewership용: 'total' 포함 */
export function normalizeViewershipPlatform(input: string): ViewershipPlatformId | null {
  const lower = input.toLowerCase().trim()
  if (lower === 'total') return 'total'
  return normalizePlatform(input)
}

/** Contents(소셜)용: PLATFORMS 통합 목록 사용 */
export function normalizeSocialPlatform(input: string): SocialPlatformId | null {
  return normalizePlatform(input)
}
