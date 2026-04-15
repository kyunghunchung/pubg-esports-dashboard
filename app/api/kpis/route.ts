import { NextRequest, NextResponse } from 'next/server'
import { requireSession, getRole } from '@/lib/auth-guard'
import { getAllKpisForEvent, upsertKpiTargets } from '@/lib/db/kpis'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const eventId = req.nextUrl.searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id is required' }, { status: 400 })

  const result = await getAllKpisForEvent(eventId)
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = getRole(session)
  if (role !== 'editor' && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { error } = await upsertKpiTargets(body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}
