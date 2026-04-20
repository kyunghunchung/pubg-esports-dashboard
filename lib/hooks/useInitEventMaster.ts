'use client'

import { useEffect, useState } from 'react'
import { EVENT_MASTER, setRuntimeEventMaster } from '@/lib/config/event-master'
import { loadEventMaster } from '@/lib/db/queries'
import type { EventMasterEntry } from '@/lib/config/event-master'

/**
 * Supabase event_master를 로드해 런타임 마스터로 세팅합니다.
 * 반환된 entries를 useMemo 의존성으로 사용하면 마스터 로드 후 자동 재계산됩니다.
 */
export function useInitEventMaster(): EventMasterEntry[] {
  const [entries, setEntries] = useState<EventMasterEntry[]>(EVENT_MASTER)

  useEffect(() => {
    loadEventMaster().then(data => {
      setRuntimeEventMaster(data)
      setEntries(data)
    })
  }, [])

  return entries
}
