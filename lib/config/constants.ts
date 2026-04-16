// ============================================================
// lib/config/constants.ts
// 플랫폼·대회 유형 등 데이터 일관성 기준을 여기서 관리합니다.
// 추가/변경 시 이 파일만 수정하면 파서·템플릿·UI에 자동 반영됩니다.
// ============================================================

// ── 뷰어십 플랫폼 ────────────────────────────────────────────
// key: DB 저장값 (소문자)  |  label: 화면 표시·엑셀 입력값
export const VIEWERSHIP_PLATFORMS = {
  twitch:  'Twitch',
  youtube: 'YouTube',
  sooptv:  'SoopTV',
  chzzk:   '치지직',
  kick:    'Kick',
  nimotv:  'NimoTV',
  total:   '전체(합산)',
} as const

export type ViewershipPlatformId = keyof typeof VIEWERSHIP_PLATFORMS

// ── 소셜 플랫폼 ──────────────────────────────────────────────
export const SOCIAL_PLATFORMS = {
  x:         'X (Twitter)',
  instagram: 'Instagram',
  facebook:  'Facebook',
  tiktok:    'TikTok',
  youtube:   'YouTube',
} as const

export type SocialPlatformId = keyof typeof SOCIAL_PLATFORMS

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
export function normalizeViewershipPlatform(input: string): ViewershipPlatformId | null {
  const lower = input.toLowerCase().trim()
  // ID 직접 매칭
  if (lower in VIEWERSHIP_PLATFORMS) return lower as ViewershipPlatformId
  // label 매칭 (치지직 등 한글 포함)
  const found = Object.entries(VIEWERSHIP_PLATFORMS).find(
    ([, label]) => label.toLowerCase() === lower
  )
  return found ? (found[0] as ViewershipPlatformId) : null
}

export function normalizeSocialPlatform(input: string): SocialPlatformId | null {
  const lower = input.toLowerCase().trim()
  if (lower in SOCIAL_PLATFORMS) return lower as SocialPlatformId
  const found = Object.entries(SOCIAL_PLATFORMS).find(
    ([, label]) => label.toLowerCase() === lower
  )
  return found ? (found[0] as SocialPlatformId) : null
}
