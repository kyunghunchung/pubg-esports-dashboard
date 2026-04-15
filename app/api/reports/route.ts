import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-guard'
import { getReportHistory, createReportRecord, getReportsByType } from '@/lib/db/reports'
import type { ReportType } from '@/types'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type') as ReportType | null
  const { data, error } = type
    ? await getReportsByType(type)
    : await getReportHistory()

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await createReportRecord({
    ...body,
    created_by: session.user?.email ?? 'unknown',
  })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
