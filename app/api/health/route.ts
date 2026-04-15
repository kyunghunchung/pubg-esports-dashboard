import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/db/supabase-server'

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient()
    // events 테이블이 존재하는지 확인
    const { error } = await supabase.from('events').select('id').limit(1)
    if (error) {
      return NextResponse.json({ ok: false, stage: 'query', message: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, message: 'Supabase 연결 및 스키마 정상' })
  } catch (e) {
    return NextResponse.json({ ok: false, stage: 'connection', message: String(e) }, { status: 500 })
  }
}
