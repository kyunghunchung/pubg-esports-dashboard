import { NextRequest, NextResponse } from 'next/server'
import { requireSession, getRole } from '@/lib/auth-guard'
import { getEvents, createEvent } from '@/lib/db/events'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = req.nextUrl.searchParams.get('year')
  const { data, error } = await getEvents(year ? Number(year) : undefined)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = getRole(session)
  if (role !== 'editor' && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { data, error } = await createEvent(body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
