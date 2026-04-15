'use client'

import { useEffect, useState } from 'react'
import { loadData, saveData } from '@/lib/store'
import { loadFromSupabase } from '@/lib/db/queries'
import type { DashboardData } from '@/lib/store'

export function useDashboardData() {
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. localStorage 캐시를 즉시 표시
    const cached = loadData()
    if (cached) setData(cached)

    // 2. Supabase에서 최신 데이터 가져오기
    loadFromSupabase()
      .then(fresh => {
        if (fresh) {
          setData(fresh)
          saveData(fresh) // 로컬 캐시 갱신
        }
      })
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}
