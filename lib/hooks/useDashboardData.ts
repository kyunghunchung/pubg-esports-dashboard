'use client'

import { useEffect, useState, useCallback } from 'react'
import { loadData, saveData } from '@/lib/store'
import { loadFromSupabase } from '@/lib/db/queries'
import type { DashboardData } from '@/lib/store'

export function useDashboardData() {
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  const fetchAndSave = useCallback(async (): Promise<boolean> => {
    const fresh = await loadFromSupabase()
    if (fresh) {
      setData(fresh)
      saveData(fresh)
      setFetchError(false)
      return true
    }
    return false
  }, [])

  // 수동 재시도 — 대시보드에서 버튼으로 호출 가능
  const refetch = useCallback(async () => {
    setFetchError(false)
    const ok = await fetchAndSave()
    if (!ok) setFetchError(true)
  }, [fetchAndSave])

  useEffect(() => {
    // 1. localStorage 캐시를 즉시 표시
    const cached = loadData()
    if (cached) setData(cached)

    let cancelled = false

    async function fetchWithRetry() {
      // 1차 시도
      const ok = await fetchAndSave()
      if (cancelled) return

      if (ok) { setLoading(false); return }

      // 1차 실패 → 즉시 로딩 완료 처리 (캐시 데이터가 있으면 보여줌)
      setLoading(false)

      // 5초 후 1회 자동 재시도 (Supabase cold start 대응)
      await new Promise(r => setTimeout(r, 5000))
      if (cancelled) return

      const retried = await fetchAndSave()
      if (!retried && !cancelled) setFetchError(true)
    }

    fetchWithRetry()
    return () => { cancelled = true }
  }, [fetchAndSave]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, fetchError, refetch }
}
