import { supabase } from './supabase-client'
import type { DashboardData } from '@/lib/store'
import type {
  Event, ViewershipKpi, SocialKpi, BroadcastKpi,
  CompetitiveKpi, LiveEventKpi, KpiTarget,
} from '@/types'

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
    if (!upsertedEvents?.length) return { error: '이벤트 저장 후 ID를 받지 못했습니다.' }

    // local string id → supabase UUID 매핑
    const idMap = new Map<string, string>()
    upsertedEvents.forEach(row => {
      const localId = data.events.find(e => e.name === row.name && e.year === row.year)?.id
      if (localId) idMap.set(localId, row.id)
    })

    const supabaseEventIds = Array.from(idMap.values())

    // 2. 기존 KPI 삭제 후 재삽입 (중복 방지)
    await Promise.all([
      supabase.from('viewership_kpis').delete().in('event_id', supabaseEventIds),
      supabase.from('social_kpis').delete().in('event_id', supabaseEventIds),
      supabase.from('broadcast_kpis').delete().in('event_id', supabaseEventIds),
      supabase.from('competitive_kpis').delete().in('event_id', supabaseEventIds),
      supabase.from('live_event_kpis').delete().in('event_id', supabaseEventIds),
      supabase.from('kpi_targets').delete().in('event_id', supabaseEventIds),
    ])

    // 3. KPI 삽입
    const toSupabaseId = (localId: string) => idMap.get(localId) ?? localId

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

    if (data.broadcast.length) {
      const { error } = await supabase.from('broadcast_kpis').insert(
        data.broadcast.map(b => ({
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
      if (error) return { error: `방송 저장 실패: ${error.message}` }
    }

    if (data.competitive.length) {
      const { error } = await supabase.from('competitive_kpis').insert(
        data.competitive.map(c => ({
          event_id:       toSupabaseId(c.event_id),
          team_count:     c.team_count     ?? null,
          player_count:   c.player_count   ?? null,
          country_count:  c.country_count  ?? null,
          prize_pool_usd: c.prize_pool_usd ?? null,
          recorded_at:    c.recorded_at,
        }))
      )
      if (error) return { error: `경쟁 저장 실패: ${error.message}` }
    }

    if (data.live_event.length) {
      const { error } = await supabase.from('live_event_kpis').insert(
        data.live_event.map(l => ({
          event_id:          toSupabaseId(l.event_id),
          total_attendance:  l.total_attendance  ?? null,
          ticket_sales_rate: l.ticket_sales_rate ?? null,
          avg_occupancy:     l.avg_occupancy     ?? null,
          recorded_at:       l.recorded_at,
        }))
      )
      if (error) return { error: `현장 저장 실패: ${error.message}` }
    }

    if (data.kpi_targets.length) {
      const { error } = await supabase.from('kpi_targets').insert(
        data.kpi_targets.map(t => ({
          event_id:     toSupabaseId(t.event_id),
          category:     t.category,
          metric:       t.metric,
          target_value: t.target_value,
          unit:         t.unit ?? null,
        }))
      )
      if (error) return { error: `KPI 목표값 저장 실패: ${error.message}` }
    }

    return { error: null }
  } catch (e) {
    return { error: String(e) }
  }
}

// ─── 불러오기 ──────────────────────────────────────────────────────────────

export async function loadFromSupabase(): Promise<DashboardData | null> {
  try {
    const [
      { data: events },
      { data: viewership },
      { data: social },
      { data: broadcast },
      { data: competitive },
      { data: live_event },
      { data: kpi_targets },
    ] = await Promise.all([
      supabase.from('events').select('*').order('year', { ascending: false }),
      supabase.from('viewership_kpis').select('*'),
      supabase.from('social_kpis').select('*'),
      supabase.from('broadcast_kpis').select('*'),
      supabase.from('competitive_kpis').select('*'),
      supabase.from('live_event_kpis').select('*'),
      supabase.from('kpi_targets').select('*'),
    ])

    if (!events?.length) return null

    return {
      events:      (events      ?? []) as Event[],
      viewership:  (viewership  ?? []) as ViewershipKpi[],
      social:      (social      ?? []) as SocialKpi[],
      broadcast:   (broadcast   ?? []) as BroadcastKpi[],
      competitive: (competitive ?? []) as CompetitiveKpi[],
      live_event:  (live_event  ?? []) as LiveEventKpi[],
      kpi_targets: (kpi_targets ?? []) as KpiTarget[],
      uploadedAt:  new Date().toISOString(),
    }
  } catch {
    return null
  }
}
