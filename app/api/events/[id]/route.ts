import { NextRequest, NextResponse } from 'next/server'
import { requireSession, getRole } from '@/lib/auth-guard'
import { getEventById, updateEvent } from '@/lib/db/events'

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await getEventById(params.id)
  if (error) return NextResponse.json({ error }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = getRole(session)
  if (role !== 'editor' && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { data, error } = await updateEvent(params.id, body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}
