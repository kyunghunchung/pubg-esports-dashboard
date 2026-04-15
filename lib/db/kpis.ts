import { createAdminSupabaseClient } from './supabase-server'
import {
  MOCK_KPI_TARGETS, MOCK_VIEWERSHIP, MOCK_SOCIAL,
  MOCK_BROADCAST, MOCK_COMPETITIVE, MOCK_LIVE_EVENT,
} from '@/lib/mock-data'
import type { KpiTarget, ViewershipKpi, SocialKpi, BroadcastKpi, CompetitiveKpi, LiveEventKpi } from '@/types'

const USE_MOCK = process.env.USE_MOCK_DATA === 'true'

export async function getKpiTargets(eventId: string): Promise<{ data: KpiTarget[]; error: string | null }> {
  if (USE_MOCK) return { data: MOCK_KPI_TARGETS[eventId] ?? [], error: null }
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('kpi_targets').select('*').eq('event_id', eventId)
  return { data: data ?? [], error: error?.message ?? null }
}

export async function upsertKpiTargets(targets: Omit<KpiTarget, 'id'>[]): Promise<{ error: string | null }> {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase.from('kpi_targets').upsert(targets, { onConflict: 'event_id,category,metric' })
  return { error: error?.message ?? null }
}

export async function getViewershipKpis(eventId: string): Promise<{ data: ViewershipKpi[]; error: string | null }> {
  if (USE_MOCK) return { data: MOCK_VIEWERSHIP[eventId] ?? [], error: null }
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('viewership_kpis').select('*').eq('event_id', eventId).order('recorded_at', { ascending: true })
  return { data: data ?? [], error: error?.message ?? null }
}

export async function getLatestViewership(eventId: string): Promise<{ data: ViewershipKpi | null; error: string | null }> {
  if (USE_MOCK) {
    const rows = MOCK_VIEWERSHIP[eventId] ?? []
    return { data: rows.find((v) => v.platform === 'total') ?? null, error: null }
  }
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('viewership_kpis').select('*').eq('event_id', eventId).eq('platform', 'total').order('recorded_at', { ascending: false }).limit(1).single()
  return { data, error: error?.message ?? null }
}

export async function getSocialKpis(eventId: string): Promise<{ data: SocialKpi[]; error: string | null }> {
  if (USE_MOCK) return { data: MOCK_SOCIAL[eventId] ?? [], error: null }
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('social_kpis').select('*').eq('event_id', eventId).order('recorded_at', { ascending: false })
  return { data: data ?? [], error: error?.message ?? null }
}

export async function getBroadcastKpis(eventId: string): Promise<{ data: BroadcastKpi | null; error: string | null }> {
  if (USE_MOCK) return { data: MOCK_BROADCAST[eventId] ?? null, error: null }
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('broadcast_kpis').select('*').eq('event_id', eventId).order('recorded_at', { ascending: false }).limit(1).single()
  return { data, error: error?.message ?? null }
}

export async function getCompetitiveKpis(eventId: string): Promise<{ data: CompetitiveKpi | null; error: string | null }> {
  if (USE_MOCK) return { data: MOCK_COMPETITIVE[eventId] ?? null, error: null }
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('competitive_kpis').select('*').eq('event_id', eventId).order('recorded_at', { ascending: false }).limit(1).single()
  return { data, error: error?.message ?? null }
}

export async function getLiveEventKpis(eventId: string): Promise<{ data: LiveEventKpi | null; error: string | null }> {
  if (USE_MOCK) return { data: MOCK_LIVE_EVENT[eventId] ?? null, error: null }
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('live_event_kpis').select('*').eq('event_id', eventId).order('recorded_at', { ascending: false }).limit(1).single()
  return { data, error: error?.message ?? null }
}

export async function getAllKpisForEvent(eventId: string) {
  const [targets, viewership, social, broadcast, competitive, liveEvent] = await Promise.all([
    getKpiTargets(eventId),
    getViewershipKpis(eventId),
    getSocialKpis(eventId),
    getBroadcastKpis(eventId),
    getCompetitiveKpis(eventId),
    getLiveEventKpis(eventId),
  ])
  return { targets, viewership, social, broadcast, competitive, liveEvent }
}
