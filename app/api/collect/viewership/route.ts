/**
 * POST /api/collect/viewership
 * Vercel Cron 또는 수동으로 호출 — Twitch + YouTube 데이터를 Supabase에 저장
 *
 * 인증: Authorization: Bearer {CRON_SECRET}
 */
import { NextRequest, NextResponse } from 'next/server'
import { getLiveStreams } from '@/lib/integrations/twitch'
import { getActiveLiveStreams } from '@/lib/integrations/youtube'
import { createAdminSupabaseClient } from '@/lib/db/supabase-server'
import { getEvents } from '@/lib/db/events'

export const dynamic = 'force-dynamic'

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // 개발 환경 — 시크릿 없으면 허용
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminSupabaseClient()
  const results: Record<string, unknown> = {}

  // 현재 live 이벤트 조회
  const { data: liveEvents } = await getEvents()
  const activeEvent = liveEvents.find((e) => e.status === 'live') ?? liveEvents.find((e) => e.status === 'upcoming')

  if (!activeEvent) {
    return NextResponse.json({ ok: true, message: '활성 이벤트 없음', results })
  }

  const eventId = activeEvent.id

  // ── Twitch ───────────────────────────────────────────────
  try {
    const channels = (process.env.TWITCH_CHANNELS ?? '').split(',').map((c) => c.trim()).filter(Boolean)
    const streams  = await getLiveStreams(channels)

    const twitchTotal = streams.reduce((sum, s) => sum + s.viewer_count, 0)

    if (streams.length > 0) {
      const rows = [
        // 플랫폼별 개별 행
        ...streams.map((s) => ({
          event_id:    eventId,
          platform:    'twitch' as const,
          peak_ccv:    s.viewer_count,
          recorded_at: new Date().toISOString(),
        })),
        // 합계 행
        {
          event_id:    eventId,
          platform:    'total' as const,
          peak_ccv:    twitchTotal,
          recorded_at: new Date().toISOString(),
        },
      ]
      const { error } = await supabase.from('viewership_kpis').insert(rows)
      results.twitch = error ? { error: error.message } : { collected: streams.length, total_ccv: twitchTotal }
    } else {
      results.twitch = { message: '라이브 스트림 없음' }
    }
  } catch (e) {
    results.twitch = { error: String(e) }
  }

  // ── YouTube ──────────────────────────────────────────────
  try {
    const channelIds = (process.env.YOUTUBE_CHANNEL_IDS ?? '').split(',').map((c) => c.trim()).filter(Boolean)

    let ytTotal = 0
    const ytStreams: { channelId: string; viewers: number; title: string }[] = []

    for (const channelId of channelIds) {
      const streams = await getActiveLiveStreams(channelId)
      const viewers = streams.reduce((sum, s) => sum + s.concurrentViewers, 0)
      ytTotal += viewers
      ytStreams.push(...streams.map((s) => ({ channelId, viewers: s.concurrentViewers, title: s.title })))
    }

    if (ytStreams.length > 0) {
      const { error } = await supabase.from('viewership_kpis').insert({
        event_id:    eventId,
        platform:    'youtube' as const,
        peak_ccv:    ytTotal,
        recorded_at: new Date().toISOString(),
      })
      results.youtube = error ? { error: error.message } : { streams: ytStreams.length, total_ccv: ytTotal }
    } else {
      results.youtube = { message: '라이브 스트림 없음' }
    }
  } catch (e) {
    results.youtube = { error: String(e) }
  }

  return NextResponse.json({ ok: true, event: activeEvent.name, results })
}
