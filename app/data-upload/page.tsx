'use client'

import { useState, useRef } from 'react'
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
import { useLang } from '@/lib/context/lang'

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
  const { t } = useLang()
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
            <h1 className="text-lg font-bold">{t('uploadAccessTitle')}</h1>
            <p className="text-sm text-gray-400 mt-1">{t('uploadAccessDesc')}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={input}
              onChange={e => { setInput(e.target.value); setError(false) }}
              placeholder={t('uploadPasswordPh')}
              autoFocus
              className={cn(
                'w-full px-4 py-2.5 rounded-lg bg-brand-bg border text-white text-sm placeholder-gray-600 outline-none transition-colors',
                error ? 'border-red-500' : 'border-brand-border focus:border-brand-accent'
              )}
            />
            {error && <p className="text-xs text-red-400">{t('uploadPasswordErr')}</p>}
            <button
              type="submit"
              className="w-full px-4 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 transition-all"
            >
              {t('confirm')}
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
  const { t, lang } = useLang()
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
      alert(t('templateComingSoon'))
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
      alert(`${t('uploadTemplateTitle')} error: ${String(e)}`)
    }
  }

  function handleFileDrop(f: File) {
    if (!f.name.match(/\.(xlsx|csv)$/i)) {
      alert(lang === 'ko'
        ? '허용 형식: .xlsx 또는 .csv 파일만 업로드할 수 있습니다.'
        : 'Only .xlsx or .csv files are allowed.')
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
      alert(`${lang === 'ko' ? '파일 분석 오류' : 'File analysis error'}: ${String(e)}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleApply() {
    if (!result || !config.mergeType || !file) return
    setUploading(true)
    try {
      const { error } = await saveTypedKpisToSupabase(
        result.events,
        config.mergeType,
        { viewership: result.viewership, social: result.social, costreaming: result.costreaming },
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
        alert(`${lang === 'ko' ? 'Supabase 저장 오류' : 'Supabase save error'}: ${error}`)
        return
      }

      const fresh = await loadFromSupabase()
      if (fresh) saveData(fresh)

      setDone(true)
    } finally {
      setUploading(false)
    }
  }

  if (tab === 'community') {
    return (
      <div className="space-y-6">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-white">{t('uploadTemplateTitle')}</h3>
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-surface border border-brand-border text-gray-600 text-sm cursor-not-allowed"
          >
            ↓ template_community.xlsx ({lang === 'ko' ? '준비 중' : 'Coming Soon'})
          </button>
          <p className="text-xs text-gray-600">{t('communityTabNotice')}</p>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-3">{t('uploadFileTitle')}</h3>
          <div className="border-2 border-dashed border-brand-border rounded-xl p-12 text-center opacity-40 cursor-not-allowed">
            <p className="text-gray-500 text-sm">{t('communityTabNotice')}</p>
          </div>
        </div>

        <UploadHistory history={[]} />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* 1. 템플릿 다운로드 */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-white">{t('uploadTemplateTitle')}</h3>
        <p className="text-xs text-gray-500">{t('uploadTemplateDesc')}</p>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent/20 border border-brand-accent/40 text-brand-accent text-sm font-medium hover:bg-brand-accent/30 transition-all"
        >
          ↓ {config.templateName}
        </button>
      </div>

      {/* 2. 파일 업로드 */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">{t('uploadFileTitle')}</h3>

        {done ? (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 space-y-3">
            <p className="text-sm font-semibold text-green-400">{t('uploadDoneTitle')}</p>
            <p className="text-xs text-gray-400">{t('uploadDoneDesc')}</p>
            <div className="flex gap-2">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 transition-all"
              >
                {t('uploadViewDashboard')}
              </Link>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-lg border border-brand-border text-gray-400 text-sm hover:text-white transition-colors"
              >
                {t('uploadAddMore')}
              </button>
            </div>
          </div>
        ) : (
          <>
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
                  <p className="text-gray-400 text-sm">{t('uploadDropText')}</p>
                  <p className="text-xs text-gray-600">{t('uploadDropSubtext')}</p>
                </div>
              )}
            </div>

            {file && !result && (
              <button
                onClick={handleAnalyze}
                disabled={uploading}
                className="px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 transition-all disabled:opacity-50"
              >
                {uploading ? t('uploadAnalyzing') : t('uploadAnalyzeBtn')}
              </button>
            )}

            {result && (
              <div className="border border-brand-border rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">{t('uploadResultTitle')}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">
                    {result.rowCount} {t('uploadRowsFound')}
                  </span>
                </div>

                {result.rowCount === 0 && result.errors.length === 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-sm font-semibold text-yellow-400">{t('uploadNoRowsTitle')}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('uploadNoRowsDesc')}</p>
                  </div>
                )}

                {result.errors.length > 0 && (
                  <div className="space-y-3">
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 space-y-1">
                      <p className="text-sm font-semibold text-red-400">{t('uploadErrorCount')} {result.errors.length}{lang === 'ko' ? '건' : ''}</p>
                      {result.errors.slice(0, 8).map((e, i) => (
                        <p key={i} className="text-xs text-red-300">{lang === 'ko' ? `${e.row}행` : `Row ${e.row}`}: {e.message}</p>
                      ))}
                      {result.errors.length > 8 && (
                        <p className="text-xs text-gray-500">
                          {lang === 'ko' ? `...외 ${result.errors.length - 8}건` : `...and ${result.errors.length - 8} more`}
                        </p>
                      )}
                    </div>
                    <UnknownEventQuickAdd
                      errors={result.errors}
                      onAddEntry={onAddEntry}
                      onAllAdded={() => { onReanalyzeReady(); setResult(null) }}
                    />
                  </div>
                )}

                {result.events.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-medium">{t('uploadEventsFound')}</p>
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
                    {uploading ? t('uploadApplying') : t('uploadApplyBtn')}
                  </button>
                  <button
                    onClick={reset}
                    className="px-5 py-2.5 rounded-lg border border-brand-border text-gray-400 text-sm hover:text-white transition-colors"
                  >
                    {t('uploadBackSelect')}
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
  const { t } = useLang()
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
        <p className="text-sm font-semibold text-yellow-400">{t('unknownEventTitle')} {unknownIds.length}</p>
        <p className="text-xs text-gray-400 mt-0.5">{t('unknownEventDesc')}</p>
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
          {adding ? t('unknownEventAdding') : t('unknownEventAddAll')}
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
  onReorder: (items: EventMasterEntry[]) => Promise<{ error: string | null }>
}) {
  const { t, lang } = useLang()
  const BLANK: EventMasterEntry = { event_id: '', display_name: '', year: new Date().getFullYear(), is_global: true, sort_order: 99, start_date: '', end_date: '' }
  const [form, setForm]         = useState<EventMasterEntry>(BLANK)
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving]     = useState(false)

  const dragIdRef               = useRef<string | null>(null)
  const [dragId, setDragId]     = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const years = Array.from(new Set(entries.map(e => e.year))).sort((a, b) => b - a)

  function openAdd() {
    setForm({ ...BLANK })
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

    const finalEntry = editMode === 'add'
      ? {
          ...form,
          sort_order: entries
            .filter(e => e.year === form.year)
            .reduce((m, e) => Math.max(m, e.sort_order), 0) + 1,
        }
      : form

    const { error } = await onAdd(finalEntry)
    if (error) alert(`${lang === 'ko' ? '저장 오류' : 'Save error'}: ${error}`)
    else closeForm()
    setSubmitting(false)
  }

  function startDrag(id: string) {
    dragIdRef.current = id
    setDragId(id)
  }

  function endDrag() {
    dragIdRef.current = null
    setDragId(null)
    setDragOverId(null)
  }

  async function handleDrop(targetId: string, year: number) {
    const fromId = dragIdRef.current
    if (!fromId || fromId === targetId) return

    const sorted = entries
      .filter(e => e.year === year)
      .sort((a, b) => a.sort_order - b.sort_order)
    const fromIdx = sorted.findIndex(e => e.event_id === fromId)
    const toIdx   = sorted.findIndex(e => e.event_id === targetId)
    if (fromIdx === -1 || toIdx === -1) return

    const reordered = [...sorted]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    const normalized = reordered.map((e, i) => ({ ...e, sort_order: i + 1 }))

    setSaving(true)
    const { error } = await onReorder(normalized)
    if (error) alert(`${lang === 'ko' ? '순서 변경 오류' : 'Reorder error'}: ${error}`)
    setSaving(false)
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{t('eventMasterTitle')}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('eventMasterDesc')}
          </p>
        </div>
        <button
          onClick={showForm ? closeForm : openAdd}
          className="px-3 py-1.5 rounded-lg bg-brand-accent/20 border border-brand-accent/40 text-brand-accent text-xs font-medium hover:bg-brand-accent/30 transition-all"
        >
          {showForm ? t('cancel') : t('eventMasterAddBtn')}
        </button>
      </div>

      {showForm && (
        <div className="px-5 py-4 border-b border-brand-border bg-brand-bg/40 space-y-3">
          <p className="text-xs font-medium text-gray-400">
            {editMode === 'edit' ? `${t('eventMasterEditing')} ${form.event_id}` : t('eventMasterNew')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t('colEventId')} *</label>
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
              <label className="text-xs text-gray-500 mb-1 block">{t('colDisplayName')} *</label>
              <input
                value={form.display_name}
                onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                placeholder="PGC 2022"
                className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-white text-sm focus:outline-none focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t('colYear')} *</label>
              <input
                type="number"
                value={form.year}
                onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-white text-sm focus:outline-none focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t('colScope')}</label>
              <select
                value={String(form.is_global)}
                onChange={e => setForm(p => ({ ...p, is_global: e.target.value === 'true' }))}
                className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-white text-sm focus:outline-none focus:border-brand-accent"
              >
                <option value="true">{t('scopeGlobal')}</option>
                <option value="false">{t('scopeRegional')}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                {lang === 'ko' ? '시작일' : 'Start Date'}
              </label>
              <input
                type="date"
                value={form.start_date ?? ''}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-white text-sm focus:outline-none focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                {lang === 'ko' ? '종료일' : 'End Date'}
              </label>
              <input
                type="date"
                value={form.end_date ?? ''}
                onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-white text-sm focus:outline-none focus:border-brand-accent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={submitting || !form.event_id.trim() || !form.display_name.trim()}
              className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/80 disabled:opacity-50 transition-all"
            >
              {submitting ? t('uploadApplying') : editMode === 'edit' ? t('editSave') : t('save')}
            </button>
            <button onClick={closeForm} className="px-4 py-2 rounded-lg border border-brand-border text-gray-400 text-sm hover:text-white transition-colors">
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="px-2 py-2 w-8"></th>
              <th className="px-4 py-2 text-left text-gray-400 font-medium text-xs">{t('colEventId')}</th>
              <th className="px-4 py-2 text-left text-gray-400 font-medium text-xs">{t('colDisplayName')}</th>
              <th className="px-4 py-2 text-left text-gray-400 font-medium text-xs">{t('colYear')}</th>
              <th className="px-4 py-2 text-left text-gray-400 font-medium text-xs">{t('colScope')}</th>
              <th className="px-4 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-gray-500 text-xs">{t('loading')}</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-gray-500 text-xs">{t('eventMasterEmpty')}</td></tr>
            ) : (
              years.flatMap(year => {
                const sorted = entries.filter(e => e.year === year).sort((a, b) => a.sort_order - b.sort_order)
                return sorted.map(e => (
                  <tr
                    key={e.event_id}
                    draggable={!saving}
                    onDragStart={() => startDrag(e.event_id)}
                    onDragOver={ev => { ev.preventDefault(); if (dragIdRef.current && dragIdRef.current !== e.event_id) setDragOverId(e.event_id) }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={async ev => { ev.preventDefault(); setDragOverId(null); await handleDrop(e.event_id, year); endDrag() }}
                    onDragEnd={endDrag}
                    className={cn(
                      'border-b border-brand-border last:border-0 group transition-all select-none',
                      saving ? 'opacity-50' : 'cursor-grab active:cursor-grabbing',
                      dragId === e.event_id ? 'opacity-30' : 'hover:bg-white/5',
                      dragOverId === e.event_id && dragId !== e.event_id && 'border-t-2 border-t-brand-accent bg-brand-accent/5',
                    )}
                  >
                    <td className="px-2 py-2 text-center text-gray-600 group-hover:text-gray-400 transition-colors text-base leading-none">
                      ⠿
                    </td>
                    <td className="px-4 py-2 font-mono text-brand-accent text-xs">{e.event_id}</td>
                    <td className="px-4 py-2 text-gray-300 text-xs">{e.display_name}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{e.year}</td>
                    <td className="px-4 py-2 text-xs">
                      {e.is_global
                        ? <span className="text-green-400">{t('scopeGlobal')}</span>
                        : <span className="text-gray-500">{t('scopeRegional')}</span>}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(e)}
                          className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          {t('edit')}
                        </button>
                        <button
                          onClick={async () => {
                            const msg = lang === 'ko'
                              ? `"${e.event_id}" 를 삭제하시겠습니까?\n같은 event_id로 다시 추가할 수 있습니다.`
                              : `Delete "${e.event_id}"?\nYou can re-add it with the same event_id.`
                            if (!confirm(msg)) return
                            const { error } = await onDelete(e.event_id)
                            if (error) alert(`${lang === 'ko' ? '삭제 오류' : 'Delete error'}: ${error}`)
                          }}
                          className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                        >
                          {t('delete')}
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
  const { t, lang } = useLang()
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-border">
        <h3 className="text-sm font-semibold text-white">{t('uploadHistoryTitle')}</h3>
      </div>
      {history.length === 0 ? (
        <p className="text-center py-10 text-gray-500 text-sm">{t('uploadHistoryEmpty')}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="px-5 py-3 text-left text-gray-400 font-medium">{t('colFilename')}</th>
              <th className="px-5 py-3 text-left text-gray-400 font-medium">{t('colUploadedAt')}</th>
              <th className="px-5 py-3 text-right text-gray-400 font-medium">{t('colRows')}</th>
              <th className="px-5 py-3 text-right text-gray-400 font-medium">{t('colStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {history.map(entry => (
              <tr key={entry.id} className="border-b border-brand-border last:border-0 hover:bg-white/5">
                <td className="px-5 py-3 text-white">{entry.filename}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(entry.uploadedAt).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US')}
                </td>
                <td className="px-5 py-3 text-right text-gray-400 tabular-nums">
                  {entry.rowCount ?? '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  {entry.status === 'success' ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">{t('statusSuccess')}</span>
                  ) : (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400"
                      title={entry.error}
                    >
                      {t('statusFail')}
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
  const { t, lang } = useLang()
  const [resetting, setResetting] = useState(false)
  const [done, setDone]           = useState(false)

  async function handleReset() {
    const msg = lang === 'ko'
      ? '⚠️ 모든 데이터를 삭제합니다.\n\nSupabase에 저장된 이벤트, 뷰어십, 콘텐츠, 코스트리밍 데이터가 모두 삭제됩니다.\n계속하시겠습니까?'
      : '⚠️ This will delete ALL data.\n\nAll events, viewership, contents, and co-streaming data in Supabase will be removed.\nContinue?'
    if (!window.confirm(msg)) return

    setResetting(true)
    try {
      const { error } = await clearAllSupabaseData()
      if (error) { alert(`${lang === 'ko' ? '초기화 오류' : 'Reset error'}: ${error}`); return }
      clearData()
      setDone(true)
      setTimeout(() => window.location.reload(), 2000)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-red-400">{t('resetTitle')}</h3>
        <p className="text-xs text-gray-500 mt-1">{t('resetDesc')}</p>
      </div>
      {done ? (
        <p className="text-xs text-green-400 font-medium">{t('resetDone')}</p>
      ) : (
        <button
          onClick={handleReset}
          disabled={resetting}
          className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-all disabled:opacity-50"
        >
          {resetting ? t('resetRunning') : t('resetBtn')}
        </button>
      )}
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function DataUploadPage() {
  const { t } = useLang()
  const [unlocked, setUnlocked]   = useState(!UPLOAD_PASSWORD)
  const [activeTab, setActiveTab] = useState<UploadTab>('viewership')
  const [reanalyzeKey, setReanalyzeKey] = useState(0)

  const { entries, loading, addEntry, removeEntry, reorderEntries } = useEventMaster()

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  const TABS: UploadTab[] = ['viewership', 'contents', 'costreaming', 'community']

  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-bold">{t('uploadPageTitle')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('uploadPageSubtitle')}</p>
        </div>

        <EventMasterPanel
          entries={entries}
          loading={loading}
          onAdd={addEntry}
          onDelete={removeEntry}
          onReorder={reorderEntries}
        />

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
                {isDisabled && <span className="ml-2 text-xs text-gray-600">(Coming Soon)</span>}
              </button>
            )
          })}
        </div>

        <UploadPanel
          key={`${activeTab}-${reanalyzeKey}`}
          tab={activeTab}
          onAddEntry={addEntry}
          onReanalyzeReady={() => setReanalyzeKey(k => k + 1)}
        />

        <ResetPanel />

      </div>
    </main>
  )
}
