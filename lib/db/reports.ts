import { createAdminSupabaseClient } from './supabase-server'
import { MOCK_REPORTS } from '@/lib/mock-data'
import type { ReportHistory, ReportType } from '@/types'

const USE_MOCK = process.env.USE_MOCK_DATA === 'true'

export async function getReportHistory(): Promise<{ data: ReportHistory[]; error: string | null }> {
  if (USE_MOCK) return { data: MOCK_REPORTS, error: null }
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('report_history').select('*').order('created_at', { ascending: false })
  return { data: data ?? [], error: error?.message ?? null }
}

export async function createReportRecord(payload: Omit<ReportHistory, 'id' | 'created_at'>): Promise<{ data: ReportHistory | null; error: string | null }> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('report_history').insert(payload).select().single()
  return { data, error: error?.message ?? null }
}

export async function getReportsByType(type: ReportType): Promise<{ data: ReportHistory[]; error: string | null }> {
  if (USE_MOCK) return { data: MOCK_REPORTS.filter((r) => r.type === type), error: null }
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('report_history').select('*').eq('type', type).order('created_at', { ascending: false })
  return { data: data ?? [], error: error?.message ?? null }
}
