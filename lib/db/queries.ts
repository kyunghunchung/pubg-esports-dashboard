import { supabase } from './supabase-client'
import type { DashboardData } from '@/lib/store'
import type {
  Event, ViewershipKpi, SocialKpi, CostreamingKpi,
} from '@/types'
import type { EventMasterEntry } from '@/lib/config/event-master'
import { EVENT_MASTER } from '@/lib/config/event-master'

// ─── 저장 ────────────────────────────────────────────────────────────────────

export async function saveToSupabase(data: DashboardData): Promise<{ error: string | null }> {
  try {
    // 1. 이벤트 upsert (name + year 기준)
    //    start_date / end_date 가 빈 문자열이면 해당 연도 기본값 사용
    // name+year 기준 dedup — 같은 이벤트가 로컬 ID / Supabase UUID 두 개로 들어올 경우 방어
    const seenEventKey = new Set<string>()
    const eventRows = data.events
      .filter(e => {
        const key = `${e.name}::${e.year}`
        if (seenEventKey.has(key)) return false
        seenEventKey.add(key)
        return true
      })
      .map(e => ({
        name:       e.name,
        type:       e.type,
        year:       e.year,
        start_date: e.start_date || `${e.year}-01-01`,
        end_date:   e.end_date   || `${e.year}-12-31`,
        venue:      e.venue  ?? null,
        region:     e.region ?? null,
        status:     e.status,
      }))

    const { data: upsertedEvents, error: evErr } = await supabase
      .from('events')
      .upsert(eventRows, { onConflict: 'name,year', ignoreDuplicates: false })
      .select('id, name, year')

    if (evErr) return { error: `이벤트 저장 실패: ${evErr.message}` }

    // upsert 결과가 비어있는 경우(기존 행 변경 없음)를 대비해 name+year로 직접 SELECT
    const eventNames = Array.from(new Set(data.events.map(e => e.name)))
    const { data: fetchedEvents, error: fetchErr } = await supabase
      .from('events')
      .select('id, name, year')
      .in('name', eventNames)

    if (fetchErr) return { error: `이벤트 ID 조회 실패: ${fetchErr.message}` }
    if (!fetchedEvents?.length) return { error: '이벤트 저장 후 ID를 받지 못했습니다.' }

    // local string id → supabase UUID 매핑
    const idMap = new Map<string, string>()
    fetchedEvents.forEach(row => {
      const localId = data.events.find(e => e.name === row.name && e.year === row.year)?.id
      if (localId) idMap.set(localId, row.id)
    })

    // 매핑 안 된 이벤트 있으면 조기 오류 반환
    const unmapped = data.events.filter(e => !idMap.has(e.id)).map(e => e.name)
    if (unmapped.length) return { error: `이벤트 UUID 매핑 실패: ${unmapped.join(', ')}` }

    const supabaseEventIds = Array.from(idMap.values())

    // 2. 기존 KPI 삭제 후 재삽입 (중복 방지)
    await Promise.all([
      supabase.from('viewership_kpis').delete().in('event_id', supabaseEventIds),
      supabase.from('social_kpis').delete().in('event_id', supabaseEventIds),
      supabase.from('costreaming_kpis').delete().in('event_id', supabaseEventIds),
    ])

    // 3. KPI 삽입
    const toSupabaseId = (localId: string) => idMap.get(localId) ?? (() => { throw new Error(`이벤트 UUID 없음: ${localId}`) })()

    if (data.viewership.length) {
      const { error } = await supabase.from('viewership_kpis').insert(
        data.viewership.map(v => ({
          event_id:        toSupabaseId(v.event_id),
          platform:        v.platform,
          peak_ccv:        v.peak_ccv        ?? null,
          acv:             v.acv             ?? null,
          hours_watched:   v.hours_watched   ?? null,
          unique_viewers:  v.unique_viewers  ?? null,
          hours_broadcast: v.hours_broadcast ?? null,
          recorded_at:     v.recorded_at,
        }))
      )
      if (error) return { error: `뷰어십 저장 실패: ${error.message}` }
    }

    if (data.social.length) {
      const { error } = await supabase.from('social_kpis').insert(
        data.social.map(s => ({
          event_id:        toSupabaseId(s.event_id),
          platform:        s.platform,
          impressions:     s.impressions,
          engagements:     s.engagements,
          video_views:     s.video_views,
          follower_delta:  s.follower_delta,
          content_count:   s.content_count   ?? null,
          region:          s.region          ?? null,
          content_type_1:  s.content_type_1  ?? null,
          content_type_2:  s.content_type_2  ?? null,
          recorded_at:     s.recorded_at,
        }))
      )
      if (error) return { error: `소셜 저장 실패: ${error.message}` }
    }

    if (data.costreaming.length) {
      const { error } = await supabase.from('costreaming_kpis').insert(
        data.costreaming.map(b => ({
          event_id:            toSupabaseId(b.event_id),
          channel_count:       b.channel_count       ?? null,
          co_streamer_count:   b.co_streamer_count   ?? null,
          co_streamer_viewers: b.co_streamer_viewers ?? null,
          coverage_regions:    b.coverage_regions    ?? null,
          clip_views:          b.clip_views          ?? null,
          region:              b.region              ?? null,
          acv:                 b.acv                 ?? null,
          cost_usd:            b.cost_usd            ?? null,
          recorded_at:         b.recorded_at,
        }))
      )
      if (error) return { error: `코스트리밍 저장 실패: ${error.message}` }
    }

    return { error: null }
  } catch (e) {
    return { error: String(e) }
  }
}

// ─── 탭별 KPI 직접 저장 (파싱 결과 → Supabase, ID 매핑 내부 처리) ─────────

export async function saveTypedKpisToSupabase(
  events: Event[],
  kpiType: 'viewership' | 'contents' | 'costreaming',
  kpis: {
    viewership?:  ViewershipKpi[]
    social?:      SocialKpi[]
    costreaming?: CostreamingKpi[]
  },
): Promise<{ error: string | null }> {
  try {
    if (!events.length) return { error: '이벤트 데이터가 없습니다.' }

    // 1. 이벤트 upsert
    const { error: evErr } = await supabase
      .from('events')
      .upsert(
        events.map(e => ({
          name:       e.name,
          type:       e.type,
          year:       e.year,
          start_date: e.start_date || `${e.year}-01-01`,
          end_date:   e.end_date   || `${e.year}-12-31`,
          venue:      e.venue  ?? null,
          region:     e.region ?? null,
          status:     e.status,
        })),
        { onConflict: 'name,year', ignoreDuplicates: false },
      )
    if (evErr) return { error: `이벤트 저장 실패: ${evErr.message}` }

    // 2. name+year 로 UUID 조회 (upsert 반환값 불안정 대비)
    const { data: fetched, error: fetchErr } = await supabase
      .from('events')
      .select('id, name, year')
      .in('name', events.map(e => e.name))
    if (fetchErr) return { error: `이벤트 ID 조회 실패: ${fetchErr.message}` }
    if (!fetched?.length) return { error: '이벤트 저장 후 ID를 받지 못했습니다.' }

    // 슬러그 → UUID 매핑
    const idMap = new Map<string, string>()
    for (const ev of events) {
      const row = fetched.find(r => r.name === ev.name && r.year === ev.year)
      if (row) idMap.set(ev.id, row.id)
    }
    const missing = events.filter(e => !idMap.has(e.id)).map(e => e.name)
    if (missing.length) return { error: `이벤트 UUID 매핑 실패: ${missing.join(', ')}` }

    const uuids = Array.from(idMap.values())
    const toUUID = (localId: string) => idMap.get(localId)!

    // 3. 해당 탭의 기존 KPI 삭제
    if (kpiType === 'viewership') {
      await supabase.from('viewership_kpis').delete().in('event_id', uuids)
      if (kpis.viewership?.length) {
        const { error } = await supabase.from('viewership_kpis').insert(
          kpis.viewership.map(v => ({
            event_id:        toUUID(v.event_id),
            platform:        v.platform,
            peak_ccv:        v.peak_ccv        ?? null,
            acv:             v.acv             ?? null,
            hours_watched:   v.hours_watched   ?? null,
            unique_viewers:  v.unique_viewers  ?? null,
            hours_broadcast: v.hours_broadcast ?? null,
            recorded_at:     v.recorded_at,
          }))
        )
        if (error) return { error: `뷰어십 저장 실패: ${error.message}` }
      }
    }

    if (kpiType === 'contents') {
      await supabase.from('social_kpis').delete().in('event_id', uuids)
      if (kpis.social?.length) {
        const { error } = await supabase.from('social_kpis').insert(
          kpis.social.map(s => ({
            event_id:       toUUID(s.event_id),
            platform:       s.platform,
            impressions:    s.impressions,
            engagements:    s.engagements,
            video_views:    s.video_views,
            follower_delta: s.follower_delta,
            content_count:  s.content_count  ?? null,
            region:         s.region         ?? null,
            content_type_1: s.content_type_1 ?? null,
            content_type_2: s.content_type_2 ?? null,
            recorded_at:    s.recorded_at,
          }))
        )
        if (error) return { error: `소셜 저장 실패: ${error.message}` }
      }
    }

    if (kpiType === 'costreaming') {
      await supabase.from('costreaming_kpis').delete().in('event_id', uuids)
      if (kpis.costreaming?.length) {
        const { error } = await supabase.from('costreaming_kpis').insert(
          kpis.costreaming.map(b => ({
            event_id:            toUUID(b.event_id),
            channel_count:       b.channel_count       ?? null,
            co_streamer_count:   b.co_streamer_count   ?? null,
            co_streamer_viewers: b.co_streamer_viewers ?? null,
            coverage_regions:    b.coverage_regions    ?? null,
            clip_views:          b.clip_views          ?? null,
            region:              b.region              ?? null,
            acv:                 b.acv                 ?? null,
            cost_usd:            b.cost_usd            ?? null,
            recorded_at:         b.recorded_at,
          }))
        )
        if (error) return { error: `코스트리밍 저장 실패: ${error.message}` }
      }
    }

    return { error: null }
  } catch (e) {
    return { error: String(e) }
  }
}

// ─── 전체 초기화 ───────────────────────────────────────────────────────────

/**
 * Supabase 의 모든 KPI 데이터 + 이벤트를 삭제합니다.
 * 1) events 테이블에서 UUID 목록을 먼저 조회
 * 2) 그 UUID 로 KPI 자식 테이블을 삭제 (.in() 은 항상 안전하게 동작)
 * 3) events 삭제
 */
export async function clearAllSupabaseData(): Promise<{ error: string | null }> {
  try {
    // 1. 전체 이벤트 UUID 조회
    const { data: evRows, error: fetchErr } = await supabase
      .from('events')
      .select('id')

    if (fetchErr) return { error: `이벤트 조회 실패: ${fetchErr.message}` }
    if (!evRows?.length) return { error: null }   // 이미 비어 있음

    const ids = evRows.map((r: { id: string }) => r.id)

    // 2. KPI 자식 테이블 삭제 (FK 제약 해소)
    const kpiDeletes = await Promise.all([
      supabase.from('viewership_kpis').delete().in('event_id', ids),
      supabase.from('social_kpis').delete().in('event_id', ids),
      supabase.from('costreaming_kpis').delete().in('event_id', ids),
    ])
    for (const res of kpiDeletes) {
      if (res.error) return { error: `KPI 삭제 실패: ${res.error.message}` }
    }

    // 3. events 삭제
    const { error: evDelErr } = await supabase
      .from('events')
      .delete()
      .in('id', ids)
    if (evDelErr) return { error: `이벤트 삭제 실패: ${evDelErr.message}` }

    return { error: null }
  } catch (e) {
    return { error: String(e) }
  }
}

// ─── EVENT_MASTER 관리 ─────────────────────────────────────────────────────

/** Supabase event_master 테이블 전체 로드. 테이블 없거나 비어있으면 정적 배열 반환 */
export async function loadEventMaster(): Promise<EventMasterEntry[]> {
  try {
    const { data, error } = await supabase
      .from('event_master')
      .select('event_id, display_name, year, is_global, sort_order')
      .order('year', { ascending: false })
      .order('sort_order', { ascending: true })
    if (error || !data?.length) return EVENT_MASTER
    return data as EventMasterEntry[]
  } catch {
    return EVENT_MASTER
  }
}

/** 이벤트 마스터 항목 추가/수정 (event_id 기준 upsert) */
export async function upsertEventMasterEntry(entry: EventMasterEntry): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('event_master')
    .upsert(
      { event_id: entry.event_id, display_name: entry.display_name, year: entry.year, is_global: entry.is_global, sort_order: entry.sort_order },
      { onConflict: 'event_id' }
    )
  return { error: error?.message ?? null }
}

/** 이벤트 마스터 항목 삭제 */
export async function deleteEventMasterEntry(event_id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('event_master')
    .delete()
    .eq('event_id', event_id)
  return { error: error?.message ?? null }
}

// ─── 불러오기 ──────────────────────────────────────────────────────────────

export async function loadFromSupabase(): Promise<DashboardData | null> {
  try {
    const [
      { data: events },
      { data: viewership },
      { data: social },
      { data: costreaming },
    ] = await Promise.all([
      supabase.from('events').select('*').order('year', { ascending: false }),
      supabase.from('viewership_kpis').select('*'),
      supabase.from('social_kpis').select('*'),
      supabase.from('costreaming_kpis').select('*'),
    ])

    if (!events?.length) return null

    return {
      events:      (events      ?? []) as Event[],
      viewership:  (viewership  ?? []) as ViewershipKpi[],
      social:      (social      ?? []) as SocialKpi[],
      costreaming: (costreaming ?? []) as CostreamingKpi[],
      uploadedAt:  new Date().toISOString(),
    }
  } catch {
    return null
  }
}
