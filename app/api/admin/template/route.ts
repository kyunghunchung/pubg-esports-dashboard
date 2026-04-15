import { NextResponse } from 'next/server'
import { generateUploadTemplate } from '@/lib/export/template'

export async function GET() {
  const buf = generateUploadTemplate()
  return new NextResponse(buf.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="pubg_esports_kpi_template.xlsx"',
    },
  })
}
