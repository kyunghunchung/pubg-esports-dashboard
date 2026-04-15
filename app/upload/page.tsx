'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn, formatNumber } from '@/lib/utils'
import { parseUploadFile, type ParsedSheet } from '@/lib/import/parse-upload'
import { saveData, clearData } from '@/lib/store'
import { saveToSupabase } from '@/lib/db/queries'
import { generateUploadTemplate } from '@/lib/export/template'

// ── 업로드 패스워드 게이트 ──────────────────────────────────
// NEXT_PUBLIC_UPLOAD_PASSWORD 환경변수가 설정된 경우에만 인증 요구
const UPLOAD_PASSWORD = process.env.NEXT_PUBLIC_UPLOAD_PASSWORD ?? ''

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input === UPLOAD_PASSWORD) {
      onUnlock()
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <main className="min-h-screen bg-brand-bg text-white flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-8 space-y-6">
          <div className="text-center">
            <p className="text-2xl mb-2">🔒</p>
            <h1 className="text-lg font-bold">업로드 접근 제한</h1>
            <p className="text-sm text-gray-400 mt-1">업로드 권한이 있는 사용자만 접근 가능합니다</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={input}
              onChange={e => { setInput(e.target.value); setError(false) }}
              placeholder="패스워드 입력"
              autoFocus
              className={cn(
                'w-full px-4 py-2.5 rounded-lg bg-brand-bg border text-white text-sm placeholder-gray-600 outline-none transition-colors',
                error ? 'border-kpi-danger' : 'border-brand-border focus:border-brand-accent'
              )}
            />
            {error && <p className="text-xs text-kpi-danger">패스워드가 올바르지 않습니다</p>}
            <button
              type="submit"
              className="w-full px-4 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 transition-all"
            >
              확인
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

const SHEET_LABEL: Record<ParsedSheet | 'events', string> = {
  events:      '이벤트',
  viewership:  '뷰어십',
  social:      '소셜',
  broadcast:   '방송',
  competitive: '경쟁',
  live_event:  '현장',
  kpi_targets: 'KPI 목표값',
}

type Step = 'upload' | 'preview' | 'done'

interface PreviewState {
  summary:    Record<string, number>
  errors:     { sheet: string; row: number; message: string }[]
  totalRows:  number
  sampleRows: { sheet: string; values: string[] }[]
  format?:    'template' | 'legacy'
}

export default function UploadPage() {
  const [unlocked, setUnlocked] = useState(!UPLOAD_PASSWORD)

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  return <UploadContent />
}

function UploadContent() {
  const router      = useRouter()
  const inputRef    = useRef<HTMLInputElement>(null)
  const [file, setFile]         = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing]   = useState(false)
  const [step, setStep]         = useState<Step>('upload')
  const [preview, setPreview]   = useState<PreviewState | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsedRef = useRef<any>(null)

  function reset() {
    setFile(null); setPreview(null); parsedRef.current = null; setStep('upload')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.xlsx')) { setFile(f); setPreview(null); setStep('upload') }
  }

  async function handleParse() {
    if (!file) return
    setParsing(true)
    try {
      const buffer = await file.arrayBuffer()
      const result = parseUploadFile(buffer)
      parsedRef.current = result

      const totalRows = Object.values(result.summary).reduce((s, n) => s + n, 0)

      // 각 시트 첫 행만 미리보기로
      const sampleRows: { sheet: string; values: string[] }[] = []
      if (result.data.events.length)      sampleRows.push({ sheet: '이벤트',     values: [result.data.events[0].name, String(result.data.events[0].year)] })
      if (result.data.viewership.length)  sampleRows.push({ sheet: '뷰어십',     values: [result.data.viewership[0].platform, formatNumber(result.data.viewership[0].peak_ccv ?? 0)] })
      if (result.data.social.length)      sampleRows.push({ sheet: '소셜',       values: [result.data.social[0].platform, formatNumber(result.data.social[0].impressions)] })

      setPreview({ summary: result.summary, errors: result.errors, totalRows, sampleRows, format: result.format })
      setStep('preview')
    } catch (e) {
      alert(`파싱 오류: ${String(e)}`)
    } finally {
      setParsing(false)
    }
  }

  async function handleSave() {
    if (!parsedRef.current) return
    const data = parsedRef.current.data
    setParsing(true)
    try {
      saveData(data)
      const { error } = await saveToSupabase(data)
      if (error) {
        alert(`저장 오류 (Supabase): ${error}\n\n데이터가 이 브라우저에만 저장되었습니다. 관리자에게 문의하세요.`)
        // 에러가 있어도 로컬에는 저장됐으므로 완료 처리
      }
      setStep('done')
    } finally {
      setParsing(false)
    }
  }

  function handleTemplateDownload() {
    try {
      const bytes = generateUploadTemplate()
      const blob  = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url   = URL.createObjectURL(blob)
      const a     = document.createElement('a')
      a.href = url; a.download = 'PUBG_KPI_템플릿.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(`템플릿 생성 오류: ${String(e)}`)
    }
  }

  function handleClear() {
    if (confirm('저장된 데이터를 모두 삭제하시겠습니까?')) { clearData(); reset() }
  }

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">데이터 업로드</h1>
            <p className="text-sm text-gray-400 mt-1">엑셀 파일로 KPI 로우 데이터를 일괄 등록합니다.</p>
          </div>
          <button
            onClick={handleClear}
            className="text-xs text-gray-600 hover:text-kpi-danger transition-colors"
          >
            저장 데이터 초기화
          </button>
        </div>

        {/* Step 1: 템플릿 */}
        <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Step 1 — 템플릿 다운로드</h2>
          <p className="text-sm text-gray-400 mb-4">
            템플릿의 <strong className="text-white">이벤트</strong> 시트를 먼저 작성한 후, 나머지 시트에 KPI를 입력하세요.
          </p>
          <button
            onClick={handleTemplateDownload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent/20 border border-brand-accent/40 text-brand-accent text-sm font-medium hover:bg-brand-accent/30 transition-all"
          >
            ↓ KPI 업로드 템플릿 (.xlsx)
          </button>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.values(SHEET_LABEL).map(label => (
              <span key={label} className="text-xs px-2.5 py-1 rounded-md bg-brand-bg border border-brand-border text-gray-400">
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* Step 2: 파일 선택 */}
        <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Step 2 — 파일 선택</h2>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
              dragging ? 'border-brand-accent bg-brand-accent/5' : 'border-brand-border hover:border-gray-500'
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) { setFile(f); setPreview(null); setStep('upload') }
              }}
            />
            {file ? (
              <div>
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-3xl text-gray-600">↑</p>
                <p className="text-gray-400 text-sm">파일을 드래그하거나 클릭하여 선택</p>
                <p className="text-xs text-gray-600">.xlsx 파일만 지원</p>
              </div>
            )}
          </div>
          {file && step === 'upload' && (
            <button
              onClick={handleParse}
              disabled={parsing}
              className="mt-4 px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 transition-all disabled:opacity-50"
            >
              {parsing ? '분석 중...' : '파일 분석 →'}
            </button>
          )}
        </section>

        {/* Step 3: 미리보기 */}
        {preview && step === 'preview' && (
          <section className="bg-brand-surface border border-brand-border rounded-xl p-6 space-y-6">
            <h2 className="text-sm font-semibold text-white">Step 3 — 미리보기 및 저장</h2>

            {/* 레거시 형식 안내 */}
            {preview.format === 'legacy' && (
              <div className="bg-brand-accent/10 border border-brand-accent/30 rounded-lg px-4 py-3 text-sm text-brand-accent">
                기존 뷰어십 데이터 파일로 감지되었습니다. 글로벌·지역 대회의 Peak CCV 데이터를 자동으로 파싱합니다.
              </div>
            )}

            {/* 시트별 행 수 */}
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
              {(Object.entries(preview.summary) as [string, number][]).map(([sheet, count]) => (
                <div key={sheet} className="text-center bg-brand-bg border border-brand-border rounded-lg p-3">
                  <p className="text-lg font-bold text-white">{count}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{SHEET_LABEL[sheet as ParsedSheet] ?? sheet}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-400">
              총 <span className="text-white font-semibold">{preview.totalRows}행</span> 인식됨
            </p>

            {/* 샘플 */}
            {preview.sampleRows.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400 mb-2">샘플 데이터</p>
                {preview.sampleRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="text-brand-accent w-16">{row.sheet}</span>
                    <span className="text-gray-300">{row.values.join(' · ')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 오류 */}
            {preview.errors.length > 0 && (
              <div className="bg-kpi-danger/10 border border-kpi-danger/30 rounded-lg p-4 space-y-1">
                <p className="text-sm font-semibold text-kpi-danger">오류 {preview.errors.length}건</p>
                {preview.errors.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-xs text-red-300">[{e.sheet}] {e.row}행: {e.message}</p>
                ))}
                {preview.errors.length > 5 && (
                  <p className="text-xs text-gray-500">...외 {preview.errors.length - 5}건</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={parsing}
                className="px-5 py-2.5 rounded-lg bg-kpi-success/20 border border-kpi-success/40 text-kpi-success text-sm font-medium hover:bg-kpi-success/30 transition-all disabled:opacity-50"
              >
                {parsing ? '저장 중...' : '대시보드에 적용 →'}
              </button>
              <button
                onClick={reset}
                className="px-5 py-2.5 rounded-lg border border-brand-border text-gray-400 text-sm font-medium hover:text-white"
              >
                다시 선택
              </button>
            </div>
          </section>
        )}

        {/* Step 4: 완료 */}
        {step === 'done' && (
          <section className="bg-brand-surface border border-kpi-success/30 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-kpi-success">✓ 적용 완료</h2>
            <p className="text-sm text-gray-400">데이터가 브라우저에 저장되었습니다. 대시보드를 확인하세요.</p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 rounded-lg bg-brand-accent/20 border border-brand-accent/40 text-brand-accent text-sm font-medium hover:bg-brand-accent/30"
              >
                대시보드 확인 →
              </button>
              <button
                onClick={reset}
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
