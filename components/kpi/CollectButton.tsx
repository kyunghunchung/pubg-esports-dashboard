'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export function CollectButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [detail, setDetail] = useState<string>('')

  async function collect() {
    setStatus('loading')
    setDetail('')
    try {
      const res = await fetch('/api/collect/viewership')
      const json = await res.json()
      if (json.ok) {
        const twitch  = json.results?.twitch?.total_ccv  != null ? `Twitch ${json.results.twitch.total_ccv.toLocaleString()}` : ''
        const youtube = json.results?.youtube?.total_ccv != null ? `YouTube ${json.results.youtube.total_ccv.toLocaleString()}` : ''
        setDetail([twitch, youtube].filter(Boolean).join(' · ') || json.message || '완료')
        setStatus('ok')
      } else {
        setDetail(json.error ?? '알 수 없는 오류')
        setStatus('error')
      }
    } catch (e) {
      setDetail(String(e))
      setStatus('error')
    }
    setTimeout(() => setStatus('idle'), 5000)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={collect}
        disabled={status === 'loading'}
        className={cn(
          'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
          status === 'loading' && 'opacity-50 cursor-not-allowed border-brand-border text-gray-400',
          status === 'ok'      && 'border-kpi-success/40 text-kpi-success bg-kpi-success/10',
          status === 'error'   && 'border-kpi-danger/40 text-kpi-danger bg-kpi-danger/10',
          status === 'idle'    && 'border-brand-border text-gray-400 hover:text-white hover:border-gray-500',
        )}
      >
        {status === 'loading' ? '수집 중...' : status === 'ok' ? '✓ 수집 완료' : status === 'error' ? '✕ 오류' : '수동 수집'}
      </button>
      {detail && <span className="text-xs text-gray-400">{detail}</span>}
    </div>
  )
}
