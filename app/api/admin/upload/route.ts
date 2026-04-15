import { NextRequest, NextResponse } from 'next/server'
import { parseUploadFile } from '@/lib/import/parse-upload'
import { createAdminSupabaseClient } from '@/lib/db/supabase-server'
import { getEvents } from '@/lib/db/events'

const TABLE_MAP = {
  viewership:  'viewership_kpis',
  social:      'social_kpis',
  broadcast:   'broadcast_kpis',
  competitive: 'competitive_kpis',
  live_event:  'live_event_kpis',
  kpi_targets: 'kpi_targets',
} as const

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const mode = (formData.get('mode') as string) ?? 'preview' // 'preview' | 'save'

  if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const { data: events } = await getEvents()
  const { rows, errors, summary } = parseUploadFile(buffer, events)

  // 미리보기 모드: 파싱 결과만 반환
  if (mode === 'preview') {
    return NextResponse.json({
      ok: true,
      summary,
      errors,
      preview: rows.slice(0, 50), // 최대 50행 미리보기
      totalRows: rows.length,
    })
  }

  // 저장 모드: Supabase에 upsert
  const supabase = createAdminSupabaseClient()
  const saveResults: Record<string, { inserted: number; error?: string }> = {}

  // 시트별로 묶어서 저장
  const bySheet = rows.reduce<Record<string, typeof rows>>((acc, row) => {
    ;(acc[row.sheet] ??= []).push(row)
    return acc
  }, {})

  for (const [sheet, sheetRows] of Object.entries(bySheet)) {
    const table = TABLE_MAP[sheet as keyof typeof TABLE_MAP]
    const payload = sheetRows.map((r) => r.data)

    const { error } = sheet === 'kpi_targets'
      ? await supabase.from(table).upsert(payload, { onConflict: 'event_id,category,metric' })
      : await supabase.from(table).insert(payload)

    saveResults[sheet] = error
      ? { inserted: 0, error: error.message }
      : { inserted: payload.length }
  }

  return NextResponse.json({ ok: true, summary, errors, saveResults })
}
