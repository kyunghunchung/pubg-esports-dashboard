import { createAdminSupabaseClient } from './supabase-server'
import { MOCK_EVENTS } from '@/lib/mock-data'
import type { Event } from '@/types'

const USE_MOCK = process.env.USE_MOCK_DATA === 'true'

export async function getEvents(year?: number): Promise<{ data: Event[]; error: string | null }> {
  if (USE_MOCK) {
    const data = year ? MOCK_EVENTS.filter((e) => e.year === year) : MOCK_EVENTS
    return { data, error: null }
  }
  const supabase = createAdminSupabaseClient()
  let query = supabase.from('events').select('*').order('start_date', { ascending: true })
  if (year) query = query.eq('year', year)
  const { data, error } = await query
  return { data: data ?? [], error: error?.message ?? null }
}

export async function getEventById(id: string): Promise<{ data: Event | null; error: string | null }> {
  if (USE_MOCK) {
    return { data: MOCK_EVENTS.find((e) => e.id === id) ?? null, error: null }
  }
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('events').select('*').eq('id', id).single()
  return { data, error: error?.message ?? null }
}

export async function getLiveEvents(): Promise<{ data: Event[]; error: string | null }> {
  if (USE_MOCK) {
    return { data: MOCK_EVENTS.filter((e) => e.status === 'live'), error: null }
  }
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('events').select('*').eq('status', 'live')
  return { data: data ?? [], error: error?.message ?? null }
}

export async function createEvent(payload: Omit<Event, 'id' | 'created_at'>): Promise<{ data: Event | null; error: string | null }> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('events').insert(payload).select().single()
  return { data, error: error?.message ?? null }
}

export async function updateEvent(id: string, payload: Partial<Omit<Event, 'id' | 'created_at'>>): Promise<{ data: Event | null; error: string | null }> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('events').update(payload).eq('id', id).select().single()
  return { data, error: error?.message ?? null }
}
