'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { saveData, clearData } from '@/lib/store'
import { saveTypedKpisToSupabase, loadFromSupabase, clearAllSupabaseData } from '@/lib/db/queries'
import {
  parseViewershipFile,
  parseContentsFile,
  parseCostreamingFile,
  type MergeType,
  type TypedParseResult,
} from '@/lib/import/parse-typed'
import {
  generateViewershipTemplate,
  generateContentsTemplate,
  generateCostreamingTemplate,
} from '@/lib/export/template'
import type { EventMasterEntry } from '@/lib/config/event-master'
import { useEventMaster } from '@/lib/hooks/useEventMaster'

// ── 업로드 히스토리 (localStorage) ──────────────────────────────
const HISTORY_KEY = 'pubg_upload_history_v1'

type UploadTab = 'viewership' | 'contents' | 'costreaming' | 'community'

interface HistoryEntry {
  id: string
  tab: UploadTab
  filename: string
  uploadedAt: string
  status: 'success' | 'failure'
  rowCount?: number
  error?: string
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 50)))
}

function addHistory(entry: HistoryEntry) {
  const existing = loadHistory()
  saveHistory([entry, ...existing])
}

// ── 탭 설정 ─────────────────────────────────────────────────────
const UPLOAD_PASSWORD = process.env.NEXT_PUBLIC_UPLOAD_PASSWORD ?? ''

const TAB_CONFIG: Record<UploadTab, { label: string; templateName: string | null; mergeType: MergeType | null }> = {
  viewership:  { label: 'Viewership',   templateName: 'template_viewership.xlsx',  mergeType: 'viewership' },
  contents:    { label: 'Contents',     templateName: 'template_contents.xlsx',    mergeType: 'contents' },
  costreaming: { label: 'Co-streaming', templateName: 'template_costreaming.xlsx', mergeType: 'costreaming' },
  community:   { label: 'Community',    templateName: null,                         mergeType: null },
}

// ── 패스워드 게이트 ──────────────────────────────────────────────
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input === UPLOAD_PASSWORD) { onUnlock() }
    else { setError(true); setInput('') }
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
                error ? 'border-red-500' : 'border-brand-border focus:border-brand-accent'
              )}
            />
            {error && <p className="text-xs text-red-400">패스워드가 올바르지 않습니다</p>}
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

// ── 업로드 패널 (공통) ───────────────────────────────────────────
function UploadPanel({ tab, onAddEntry, onReanalyzeReady }: {
  tab: UploadTab
  onAddEntry: (entry: EventMasterEntry) => Promise<{ error: string | null }>
  onReanalyzeReady: () => void
}) {
  const config       = TAB_CONFIG[tab]
  const inputRef     = useRef<HTMLInputElement>(null)
  const [dragging, setDragging]   = useState(false)
  const [file, setFile]           = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult]       = useState<TypedParseResult | null>(null)
  const [done, setDone]           = useState(false)
  const [history, setHistory]     = useState<HistoryEntry[]>(() =>
    loadHistory().filter(h => h.tab === tab)
  )

  function refreshHistory() {
    setHistory(loadHistory().filter(h => h.tab === tab))
  }

  function reset() {
    setFile(null); setResult(null); setDone(false)
  }

  function downloadTemplate() {
    if (!config.templateName) {
      alert('이 탭의 템플릿은 아직 준비 중입니다.')
      return
    }
    try {
      let bytes: Uint8Array
      if (tab === 'viewership')  bytes = generateViewershipTemplate()
      else if (tab === 'contents') bytes = generateContentsTemplate()
      else bytes = generateCostreamingTemplate()

      const blob = new Blob([bytes.buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href = url; a.download = config.templateName!
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (e) {
      alert(`템플릿 생성 오류: ${String(e)}`)
    }
  }

  function handleFileDrop(f: File) {
    if (!f.name.match(/\.(xlsx|csv)$/i)) {
      alert('허용 형식: .xlsx 또는 .csv 파일만 업로드할 수 있습니다.')
      return
    }
    setFile(f); setResult(null); setDone(false)
  }

  async function handleAnalyze() {
    if (!file || !config.mergeType) return
    setUploading(true)
    try {
      const buffer = await file.arrayBuffer()
      let parsed: TypedParseResult
      if (tab === 'viewership')  parsed = parseViewershipFile(buffer)
      else if (tab === 'contents') parsed = parseContentsFile(buffer)
      else parsed = parseCostreamingFile(buffer)
      setResult(parsed)
    } catch (e) {
      alert(`파일 분석 오류: ${String(e)}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleApply() {
    if (!result || !config.mergeType || !file) return
    setUploading(true)
    try {
      // 1. 파싱 결과를 Supabase에 직접 저장 (슬러그 → UUID 매핑 내부 처리)
      const { error } = await saveTypedKpisToSupabase(
        result.events,
        config.mergeType,
        { viewership: result.viewership, social: result.social, broadcast: result.broadcast },
      )

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        tab,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        status: error ? 'failure' : 'success',
        rowCount: result.rowCount,
        error: error ?? undefined,
      }
      addHistory(entry)
      refreshHistory()

      if (error) {
        alert(`Supabase 저장 오류: ${error}`)
        return
      }

      // 2. Supabase에서 최신 데이터 재로드 → localStorage 갱신 (UUID 기반으로 정규화)
      const fresh = await loadFromSupabase()
      if (fresh) saveData(fresh)

      setDone(true)
    } finally {
      setUploading(false)
    }
  }

  // Community 탭: 비활성 상태 (onAddEntry / onReanalyzeReady 미사용)
  if (tab === 'community') {
    return (
      <div className="space-y-6">
        {/* 템플릿 영역 */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-white">템플릿 다운로드</h3>
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-surface border border-brand-border text-gray-600 text-sm cursor-not-allowed"
          >
            ↓ template_community.xlsx (준비 중)
          </button>
          <p className="text-xs text-gray-600">커뮤니티 데이터 템플릿은 추후 확정 예정입니다.</p>
        </div>

        {/* 업로드 영역 */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-3">파일 업로드</h3>
          <div className="border-2 border-dashed border-brand-border rounded-xl p-12 text-center opacity-40 cursor-not-allowed">
            <p className="text-gray-500 text-sm">Community 업로드 기능은 준비 중입니다.</p>
          </div>
        </div>

        {/* 히스토리 */}
        <UploadHistory history={[]} />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* 1. 템플릿 다운로드 */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-white">템플릿 다운로드</h3>
        <p className="text-xs text-gray-500">
          이 템플릿에 데이터를 입력 후 아래 영역에 업로드하세요. 기존 데이터와 병합됩니다.
        </p>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent/20 border border-brand-accent/40 text-brand-accent text-sm font-medium hover:bg-brand-accent/30 transition-all"
        >
          ↓ {config.templateName}
        </button>
      </div>

      {/* 2. 파일 업로드 */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">파일 업로드</h3>

        {done ? (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 space-y-3">
            <p className="text-sm font-semibold text-green-400">✓ 적용 완료</p>
            <p className="text-xs text-gray-400">데이터가 Supabase에 저장되었고 대시보드에 반영됩니다.</p>
            <div className="flex gap-2">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 transition-all"
              >
                대시보드 보기 →
              </Link>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-lg border border-brand-border text-gray-400 text-sm hover:text-white transition-colors"
              >
                추가 업로드
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 드래그앤드롭 영역 */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileDrop(f) }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
                dragging ? 'border-brand-accent bg-brand-accent/5' : 'border-brand-border hover:border-gray-500'
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileDrop(f) }}
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
                  <p className="text-xs text-gray-600">.xlsx / .csv</p>
                </div>
              )}
            </div>

            {/* 분석 버튼 */}
            {file && !result && (
              <button
                onClick={handleAnalyze}
                disabled={uploading}
                className="px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 transition-all disabled:opacity-50"
              >
                {uploading ? '분석 중...' : '파일 분석 →'}
              </button>
            )}

            {/* 분석 결과 */}
            {result && (
              <div className="border border-brand-border rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">분석 결과</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">
                    {result.rowCount}행 인식
                  </span>
                </div>

                {/* 0행 + 오류: 컬럼 형식 오류 가능성 강조 */}
                {result.rowCount === 0 && result.errors.length === 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-sm font-semibold text-yellow-400">인식된 데이터 없음</p>
                    <p className="text-xs text-gray-400 mt-1">컬럼명이 템플릿과 다를 수 있습니다. 템플릿을 다운로드해서 형식을 확인해주세요.</p>
                  </div>
                )}

                {/* 오류 목록 */}
                {result.errors.length > 0 && (
                  <div className="space-y-3">
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 space-y-1">
                      <p className="text-sm font-semibold text-red-400">오류 {result.errors.length}건</p>
                      {result.errors.slice(0, 8).map((e, i) => (
                        <p key={i} className="text-xs text-red-300">{e.row}행: {e.message}</p>
                      ))}
                      {result.errors.length > 8 && (
                        <p className="text-xs text-gray-500">...외 {result.errors.length - 8}건</p>
                      )}
                    </div>
                    {/* 미등록 event_id 빠른 추가 */}
                    <UnknownEventQuickAdd
                      errors={result.errors}
                      onAddEntry={onAddEntry}
                      onAllAdded={() => { onReanalyzeReady(); setResult(null) }}
                    />
                  </div>
                )}

                {/* 이벤트 목록 미리보기 */}
                {result.events.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-medium">인식된 이벤트</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.events.map(e => (
                        <span key={e.id} className="text-xs px-2.5 py-1 rounded-md bg-brand-bg border border-brand-border text-gray-300">
                          {e.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleApply}
                    disabled={uploading || result.rowCount === 0}
                    className="px-5 py-2.5 rounded-lg bg-green-600/20 border border-green-500/40 text-green-400 text-sm font-medium hover:bg-green-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {uploading ? '저장 중...' : '대시보드에 적용 →'}
                  </button>
                  <button
                    onClick={reset}
                    className="px-5 py-2.5 rounded-lg border border-brand-border text-gray-400 text-sm hover:text-white transition-colors"
                  >
                    다시 선택
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. 업로드 히스토리 */}
      <UploadHistory history={history} />
    </div>
  )
}

// ── 미등록 event_id 빠른 추가 ────────────────────────────────────
function UnknownEventQuickAdd({
  errors,
  onAddEntry,
  onAllAdded,
}: {
  errors: { row: number; message: string }[]
  onAddEntry: (entry: EventMasterEntry) => Promise<{ error: string | null }>
  onAllAdded: () => void
}) {
  // 오류 메시지에서 미등록 event_id 추출
  const unknownIds = Array.from(new Set(
    errors
      .map(e => /등록되지 않은 이벤트입니다: "([^"]+)"/.exec(e.message)?.[1])
      .filter((id): id is string => Boolean(id))
  ))

  const [adding, setAdding] = useState(false)
  const [added, setAdded]   = useState<Set<string>>(new Set())

  if (!unknownIds.length) return null

  function guessEntry(id: string): EventMasterEntry {
    const yearMatch = /_(\d{4})$/.exec(id)
    const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear()
    const display = id.replace(/_(\d{4})$/, ' $1').replace(/_/g, ' ')
    return { event_id: id, display_name: display, year, is_global: true, sort_order: 99 }
  }

  async function handleAddAll() {
    setAdding(true)
    for (const id of unknownIds) {
      if (added.has(id)) continue
      const { error } = await onAddEntry(guessEntry(id))
      if (!error) setAdded(prev => new Set(Array.from(prev).concat(id)))
    }
    setAdding(false)
    onAllAdded()
  }

  const remaining = unknownIds.filter(id => !added.has(id))

  return (
    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-yellow-400">미등록 이벤트 {unknownIds.length}개 감지됨</p>
        <p className="text-xs text-gray-400 mt-0.5">아래 event_id를 Event Master에 추가하면 바로 업로드할 수 있습니다.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {unknownIds.map(id => (
          <span key={id} className={cn(
            'text-xs px-2.5 py-1 rounded-md border font-mono',
            added.has(id)
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-brand-bg border-brand-border text-yellow-300'
          )}>
            {id}{added.has(id) ? ' ✓' : ''}
          </span>
        ))}
      </div>
      {remaining.length > 0 && (
        <button
          onClick={handleAddAll}
          disabled={adding}
          className="px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-sm font-medium hover:bg-yellow-500/30 transition-all disabled:opacity-50"
        >
          {adding ? '추가 중...' : `전체 추가 후 재분석 →`}
        </button>
      )}
    </div>
  )
}

// ── 이벤트 마스터 관리 패널 ──────────────────────────────────────
function EventMasterPanel({
  entries,
  loading,
  onAdd,
  onDelete,
  onReorder,
}: {
  entries: EventMasterEntry[]
  loading: boolean
  onAdd: (entry: EventMasterEntry) => Promise<{ error: string | null }>
  onDelete: (event_id: string) => Promise<{ error: string | null }>
  onReorder: (a: EventMasterEntry, b: EventMasterEntry) => Promise<{ error: string | null }>
}) {
  const BLANK: EventMasterEntry = { event_id: '', display_name: '', year: new Date().getFullYear(), is_global: true, sort_order: 99 }
  const [form, setForm]         = useState<EventMasterEntry>(BLANK)
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reordering, setReordering] = useState(false)

  const years = Array.from(new Set(entries.map(e => e.year))).sort((a, b) => b - a)

  function openAdd() {
    const maxSortOrder = entries.filter(e => e.year === form.year).reduce((m, e) => Math.max(m, e.sort_order), 0)
    setForm({ ...BLANK, sort_order: maxSortOrder + 1 })
    setEditMode('add')
    setShowForm(true)
  }

  function openEdit(e: EventMasterEntry) {
    setForm({ ...e })
    setEditMode('edit')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setForm(BLANK)
  }

  async function handleSave() {
    if (!form.event_id.trim() || !form.display_name.trim()) return
    setSubmitting(true)
    const { error } = await onAdd(form)
    if (error) alert(`저장 오류: ${error}`)
    else closeForm()
    setSubmitting(false)
  }

  async function handleReorder(entry: EventMasterEntry, dir: 'up' | 'down') {
    const sorted = entries.filter(e => e.year === entry.year).sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex(e => e.event_id === entry.event_id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    setReordering(true)
    const { error } = await onReorder(entry, sorted[swapIdx])
    if (error) alert(`순서 변경 오류: ${error}`)
    setReordering(false)
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">이벤트 마스터 관리</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            업로드 파일의 <code className="bg-brand-bg px-1 py-0.5 rounded text-brand-accent">event_id</code> 컬럼에 사용 가능한 값 목록
          </p>
        </div>
        <button
          onClick={showForm ? closeForm : openAdd}
          className="px-3 py-1.5 rounded-lg bg-brand-accent/20 border border-brand-accent/40 text-brand-accent text-xs font-medium hover:bg-brand-accent/30 transition-all"
        >
          {showForm ? '취소' : '+ 이벤트 추가'}
        </button>
      </div>

      {/* 추가 / 수정 폼 */}
      {showForm && (
        <div className="px-5 py-4 border-b border-brand-border bg-brand-bg/40 space-y-3">
          <p className="text-xs font-medium text-gray-400">
            {editMode === 'edit' ? `수정 중: ${form.event_id}` : '새 이벤트 등록'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">event_id *</label>
              <input
                value={form.event_id}
                readOnly={editMode === 'edit'}
                onChange={e => setForm(p => ({ ...p, event_id: e.target.value.replace(/\s+/g, '').toUpperCase() }))}
                placeholder="PGC_2022"
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-white text-sm focus:outline-none focus:border-brand-accent',
                  editMode === 'edit' && 'opacity-50 cursor-not-allowed'
                )}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">표시명 *</label>
              <input
                value={form.display_name}
                onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                placeholder="PGC 2022"
                className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-white text-sm focus:outline-none focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">연도 *</label>
              <input
                type="number"
                value={form.year}
                onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-white text-sm focus:outline-none focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">구분</label>
              <select
                value={String(form.is_global)}
                onChange={e => setForm(p => ({ ...p, is_global: e.target.value === 'true' }))}
                className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-white text-sm focus:outline-none focus:border-brand-accent"
              >
                <option value="true">글로벌</option>
                <option value="false">지역</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={submitting || !form.event_id.trim() || !form.display_name.trim()}
              className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 disabled:opacity-50 transition-all"
            >
              {submitting ? '저장 중...' : editMode === 'edit' ? '수정 저장' : '추가'}
            </button>
            <button onClick={closeForm} className="px-4 py-2 rounded-lg border border-brand-border text-gray-400 text-sm hover:text-white transition-colors">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="px-2 py-2 w-14"></th>
              <th className="px-4 py-2 text-left text-gray-400 font-medium text-xs">event_id</th>
              <th className="px-4 py-2 text-left text-gray-400 font-medium text-xs">표시명</th>
              <th className="px-4 py-2 text-left text-gray-400 font-medium text-xs">연도</th>
              <th className="px-4 py-2 text-left text-gray-400 font-medium text-xs">구분</th>
              <th className="px-4 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-gray-500 text-xs">불러오는 중...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-gray-500 text-xs">등록된 이벤트가 없습니다</td></tr>
            ) : (
              years.flatMap(year => {
                const sorted = entries.filter(e => e.year === year).sort((a, b) => a.sort_order - b.sort_order)
                return sorted.map((e, idx) => (
                  <tr key={e.event_id} className="border-b border-brand-border last:border-0 group hover:bg-white/5">
                    {/* 순서 버튼 */}
                    <td className="px-2 py-2">
                      <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleReorder(e, 'up')}
                          disabled={reordering || idx === 0}
                          className="text-gray-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed text-xs leading-none px-1"
                          title="위로"
                        >▲</button>
                        <button
                          onClick={() => handleReorder(e, 'down')}
                          disabled={reordering || idx === sorted.length - 1}
                          className="text-gray-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed text-xs leading-none px-1"
                          title="아래로"
                        >▼</button>
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-brand-accent text-xs">{e.event_id}</td>
                    <td className="px-4 py-2 text-gray-300 text-xs">{e.display_name}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{e.year}</td>
                    <td className="px-4 py-2 text-xs">
                      {e.is_global
                        ? <span className="text-green-400">글로벌</span>
                        : <span className="text-gray-500">지역</span>}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(e)}
                          className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`"${e.event_id}" 를 삭제하시겠습니까?\n같은 event_id로 다시 추가할 수 있습니다.`)) return
                            const { error } = await onDelete(e.event_id)
                            if (error) alert(`삭제 오류: ${error}`)
                          }}
                          className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 업로드 히스토리 테이블 ───────────────────────────────────────
function UploadHistory({ history }: { history: HistoryEntry[] }) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-border">
        <h3 className="text-sm font-semibold text-white">업로드 히스토리</h3>
      </div>
      {history.length === 0 ? (
        <p className="text-center py-10 text-gray-500 text-sm">업로드 기록 없음</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="px-5 py-3 text-left text-gray-400 font-medium">파일명</th>
              <th className="px-5 py-3 text-left text-gray-400 font-medium">업로드 일시</th>
              <th className="px-5 py-3 text-right text-gray-400 font-medium">행 수</th>
              <th className="px-5 py-3 text-right text-gray-400 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {history.map(entry => (
              <tr key={entry.id} className="border-b border-brand-border last:border-0 hover:bg-white/5">
                <td className="px-5 py-3 text-white">{entry.filename}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(entry.uploadedAt).toLocaleString('ko-KR')}
                </td>
                <td className="px-5 py-3 text-right text-gray-400 tabular-nums">
                  {entry.rowCount ?? '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  {entry.status === 'success' ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">성공</span>
                  ) : (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400"
                      title={entry.error}
                    >
                      실패
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── 전체 초기화 패널 ────────────────────────────────────────────
function ResetPanel() {
  const [resetting, setResetting] = useState(false)
  const [done, setDone]           = useState(false)

  async function handleReset() {
    if (!window.confirm(
      '⚠️ 모든 데이터를 삭제합니다.\n\nSupabase에 저장된 이벤트, 뷰어십, 콘텐츠, 코스트리밍 데이터가 모두 삭제됩니다.\n계속하시겠습니까?'
    )) return

    setResetting(true)
    try {
      const { error } = await clearAllSupabaseData()
      if (error) { alert(`초기화 오류: ${error}`); return }
      clearData()   // localStorage 캐시 삭제
      setDone(true)
      // 2초 후 페이지 새로고침 — 모든 컴포넌트 상태 초기화
      setTimeout(() => window.location.reload(), 2000)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-red-400">데이터 전체 초기화</h3>
        <p className="text-xs text-gray-500 mt-1">
          Supabase와 로컬 캐시의 모든 KPI 데이터를 삭제합니다. 삭제 후 새 템플릿을 업로드해 채워넣으세요.
        </p>
      </div>
      {done ? (
        <p className="text-xs text-green-400 font-medium">✓ 초기화 완료. 이제 새 데이터를 업로드하세요.</p>
      ) : (
        <button
          onClick={handleReset}
          disabled={resetting}
          className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-all disabled:opacity-50"
        >
          {resetting ? '삭제 중...' : '모든 데이터 삭제'}
        </button>
      )}
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function DataUploadPage() {
  const [unlocked, setUnlocked]   = useState(!UPLOAD_PASSWORD)
  const [activeTab, setActiveTab] = useState<UploadTab>('viewership')
  const [reanalyzeKey, setReanalyzeKey] = useState(0)

  const { entries, loading, addEntry, removeEntry, reorderEntries } = useEventMaster()

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  const TABS: UploadTab[] = ['viewership', 'contents', 'costreaming', 'community']

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold">Data Upload</h1>
          <p className="text-sm text-gray-400 mt-1">
            탭별로 데이터를 업로드합니다. 업로드 실패 시 기존 데이터는 보존됩니다.
          </p>
        </div>

        {/* 이벤트 마스터 관리 (탭 공통) */}
        <EventMasterPanel
          entries={entries}
          loading={loading}
          onAdd={addEntry}
          onDelete={removeEntry}
          onReorder={reorderEntries}
        />

        {/* 탭 */}
        <div className="flex gap-0 border-b border-brand-border">
          {TABS.map(tab => {
            const cfg = TAB_CONFIG[tab]
            const isDisabled = tab === 'community'
            return (
              <button
                key={tab}
                onClick={() => !isDisabled && setActiveTab(tab)}
                className={cn(
                  'px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-all',
                  activeTab === tab
                    ? 'border-brand-accent text-white'
                    : 'border-transparent text-gray-400 hover:text-white',
                  isDisabled && 'opacity-40 cursor-not-allowed hover:text-gray-400',
                )}
              >
                {cfg.label}
                {isDisabled && <span className="ml-2 text-xs text-gray-600">(준비 중)</span>}
              </button>
            )
          })}
        </div>

        {/* 탭 콘텐츠 */}
        <UploadPanel
          key={`${activeTab}-${reanalyzeKey}`}
          tab={activeTab}
          onAddEntry={addEntry}
          onReanalyzeReady={() => setReanalyzeKey(k => k + 1)}
        />

        {/* 데이터 초기화 (하단 위험 영역) */}
        <ResetPanel />

      </div>
    </main>
  )
}
