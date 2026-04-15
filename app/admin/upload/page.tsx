'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { cn, formatNumber } from '@/lib/utils'
import type { ParsedSheet } from '@/lib/import/parse-upload'

const SHEET_LABEL: Record<ParsedSheet, string> = {
  viewership:  '뷰어십',
  social:      '소셜',
  broadcast:   '방송',
  competitive: '경쟁',
  live_event:  '현장',
  kpi_targets: 'KPI 목표값',
}

interface PreviewData {
  summary:   Record<ParsedSheet, number>
  errors:    { sheet: string; row: number; message: string }[]
  preview:   { sheet: ParsedSheet; data: Record<string, unknown> }[]
  totalRows: number
}

interface SaveResult {
  saveResults: Record<string, { inserted: number; error?: string }>
}

export default function AdminUploadPage() {
  const inputRef   = useRef<HTMLInputElement>(null)
  const [file, setFile]           = useState<File | null>(null)
  const [dragging, setDragging]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [preview, setPreview]     = useState<PreviewData | null>(null)
  const [saved, setSaved]         = useState<SaveResult | null>(null)
  const [step, setStep]           = useState<'upload' | 'preview' | 'done'>('upload')

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.endsWith('.xlsx')) { setFile(dropped); setPreview(null); setSaved(null); setStep('upload') }
  }

  async function handlePreview() {
    if (!file) return
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('mode', 'preview')
    const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const json = await res.json()
    setPreview(json)
    setStep('preview')
    setLoading(false)
  }

  async function handleSave() {
    if (!file) return
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('mode', 'save')
    const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const json = await res.json()
    setSaved(json)
    setStep('done')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="border-b border-brand-border">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">← 대시보드</Link>
          <h1 className="text-2xl font-bold">과거 데이터 업로드</h1>
          <p className="text-sm text-gray-400 mt-1">엑셀 파일로 KPI 과거 데이터를 일괄 등록합니다.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Step 0: 템플릿 다운로드 */}
        <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Step 1 — 템플릿 다운로드</h2>
          <p className="text-sm text-gray-400 mb-4">
            아래 템플릿을 받아서 과거 데이터를 입력하세요. 각 시트의 예시 행을 참고해 동일한 형식으로 작성합니다.
          </p>
          <a
            href="/api/admin/template"
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent/20 border border-brand-accent/40 text-brand-accent text-sm font-medium hover:bg-brand-accent/30 transition-all"
          >
            ↓ KPI 업로드 템플릿 (.xlsx)
          </a>
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Object.values(SHEET_LABEL).map((label) => (
              <span key={label} className="text-xs text-center px-2 py-1 rounded bg-brand-bg border border-brand-border text-gray-400">
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* Step 2: 파일 업로드 */}
        <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Step 2 — 파일 업로드</h2>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
              dragging ? 'border-brand-accent bg-brand-accent/5' : 'border-brand-border hover:border-gray-500'
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) { setFile(f); setPreview(null); setSaved(null); setStep('upload') }
              }}
            />
            {file ? (
              <div>
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 text-sm">파일을 드래그하거나 클릭하여 선택</p>
                <p className="text-xs text-gray-500 mt-1">.xlsx 파일만 지원</p>
              </div>
            )}
          </div>

          {file && step === 'upload' && (
            <button
              onClick={handlePreview}
              disabled={loading}
              className="mt-4 px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 transition-all disabled:opacity-50"
            >
              {loading ? '분석 중...' : '파일 분석 →'}
            </button>
          )}
        </section>

        {/* Step 3: 미리보기 */}
        {preview && step === 'preview' && (
          <section className="bg-brand-surface border border-brand-border rounded-xl p-6 space-y-6">
            <h2 className="text-sm font-semibold text-white">Step 3 — 미리보기 및 확인</h2>

            {/* 요약 */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {(Object.entries(preview.summary) as [ParsedSheet, number][]).map(([sheet, count]) => (
                <div key={sheet} className="text-center bg-brand-bg border border-brand-border rounded-lg p-3">
                  <p className="text-lg font-bold text-white">{count}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{SHEET_LABEL[sheet]}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-400">총 <span className="text-white font-semibold">{preview.totalRows}행</span> 인식됨</p>

            {/* 오류 */}
            {preview.errors.length > 0 && (
              <div className="bg-kpi-danger/10 border border-kpi-danger/30 rounded-lg p-4 space-y-1">
                <p className="text-sm font-semibold text-kpi-danger">오류 {preview.errors.length}건 — 저장 전 수정 필요</p>
                {preview.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-300">[{e.sheet}] {e.row}행: {e.message}</p>
                ))}
              </div>
            )}

            {/* 미리보기 테이블 (첫 10행) */}
            {preview.preview.length > 0 && (
              <div className="overflow-x-auto">
                <p className="text-xs text-gray-400 mb-2">처음 {Math.min(preview.preview.length, 10)}행 미리보기</p>
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr className="border-b border-brand-border">
                      <th className="px-3 py-2 text-left text-gray-400">시트</th>
                      {Object.keys(preview.preview[0]?.data ?? {}).slice(0, 6).map((k) => (
                        <th key={k} className="px-3 py-2 text-left text-gray-400">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-brand-border last:border-0 hover:bg-white/5">
                        <td className="px-3 py-2 text-brand-accent">{SHEET_LABEL[row.sheet]}</td>
                        {Object.values(row.data).slice(0, 6).map((v, j) => (
                          <td key={j} className="px-3 py-2 text-gray-300 tabular-nums">
                            {typeof v === 'number' ? formatNumber(v) : String(v ?? '—').slice(0, 20)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 저장 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={loading || preview.errors.length > 0}
                className="px-5 py-2.5 rounded-lg bg-kpi-success/20 border border-kpi-success/40 text-kpi-success text-sm font-medium hover:bg-kpi-success/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? '저장 중...' : `Supabase에 저장 (${preview.totalRows}행)`}
              </button>
              <button
                onClick={() => { setFile(null); setPreview(null); setStep('upload') }}
                className="px-5 py-2.5 rounded-lg border border-brand-border text-gray-400 text-sm font-medium hover:text-white"
              >
                다시 업로드
              </button>
            </div>
            {preview.errors.length > 0 && (
              <p className="text-xs text-kpi-danger">오류를 수정한 후 저장할 수 있습니다.</p>
            )}
          </section>
        )}

        {/* Step 4: 완료 */}
        {saved && step === 'done' && (
          <section className="bg-brand-surface border border-kpi-success/30 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-kpi-success">✓ 저장 완료</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(saved.saveResults).map(([sheet, result]) => (
                <div key={sheet} className={cn(
                  'p-3 rounded-lg border text-center',
                  result.error ? 'border-kpi-danger/30 bg-kpi-danger/10' : 'border-kpi-success/30 bg-kpi-success/10'
                )}>
                  <p className="text-lg font-bold text-white">{result.inserted}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{SHEET_LABEL[sheet as ParsedSheet] ?? sheet}</p>
                  {result.error && <p className="text-xs text-kpi-danger mt-1">{result.error}</p>}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-brand-accent/20 border border-brand-accent/40 text-brand-accent text-sm font-medium hover:bg-brand-accent/30">
                대시보드 확인 →
              </Link>
              <button
                onClick={() => { setFile(null); setPreview(null); setSaved(null); setStep('upload') }}
                className="px-4 py-2 rounded-lg border border-brand-border text-gray-400 text-sm font-medium hover:text-white"
              >
                추가 업로드
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
