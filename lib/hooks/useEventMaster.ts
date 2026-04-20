'use client'

import { useEffect, useState, useCallback } from 'react'
import type { EventMasterEntry } from '@/lib/config/event-master'
import { EVENT_MASTER, setRuntimeEventMaster } from '@/lib/config/event-master'
import { loadEventMaster, upsertEventMasterEntry, deleteEventMasterEntry } from '@/lib/db/queries'

export function useEventMaster() {
  const [entries, setEntries] = useState<EventMasterEntry[]>(EVENT_MASTER)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await loadEventMaster()
      setEntries(data)
      setRuntimeEventMaster(data)  // 파서도 최신 목록 사용
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  async function addEntry(entry: EventMasterEntry): Promise<{ error: string | null }> {
    const { error } = await upsertEventMasterEntry(entry)
    if (!error) await reload()
    return { error }
  }

  async function removeEntry(event_id: string): Promise<{ error: string | null }> {
    const { error } = await deleteEventMasterEntry(event_id)
    if (!error) await reload()
    return { error }
  }

  /**
   * 연도 내 항목 배열을 새 순서(이미 정규화된 sort_order 포함)로 일괄 저장합니다.
   * 패널 쪽에서 배열 재배치 + sort_order 1,2,3... 재할당을 완료한 뒤 호출하세요.
   */
  async function reorderEntries(items: EventMasterEntry[]): Promise<{ error: string | null }> {
    const results = await Promise.all(items.map(item => upsertEventMasterEntry(item)))
    const error = results.find(r => r.error)?.error ?? null
    if (!error) await reload()
    return { error }
  }

  return { entries, loading, reload, addEntry, removeEntry, reorderEntries }
}
