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

  /** 같은 연도 내 두 항목의 sort_order 를 교환합니다 */
  async function reorderEntries(a: EventMasterEntry, b: EventMasterEntry): Promise<{ error: string | null }> {
    const [ra, rb] = await Promise.all([
      upsertEventMasterEntry({ ...a, sort_order: b.sort_order }),
      upsertEventMasterEntry({ ...b, sort_order: a.sort_order }),
    ])
    const error = ra.error ?? rb.error ?? null
    if (!error) await reload()
    return { error }
  }

  return { entries, loading, reload, addEntry, removeEntry, reorderEntries }
}
