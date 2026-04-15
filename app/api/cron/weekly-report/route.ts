import { NextRequest, NextResponse } from 'next/server'
import { createReportRecord } from '@/lib/db/reports'
import { getEvents } from '@/lib/db/events'

// Vercel Cron: 매주 월요일 09:00 KST (00:00 UTC)
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const year = now.getFullYear()
  const { data: events } = await getEvents(year)

  const activeEvents = (events ?? []).filter(
    (e) => e.status === 'live' || e.status === 'upcoming'
  )

  const title = `주간 실적 요약 — ${now.toLocaleDateString('ko-KR')}`
  const { data, error } = await createReportRecord({
    title,
    type: 'weekly',
    event_ids: activeEvents.map((e) => e.id),
    created_by: 'cron',
    file_url: undefined,
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true, report: data })
}
