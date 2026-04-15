'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/db/supabase-client'
import type { ViewershipKpi } from '@/types'

export function useViewershipRealtime(eventId: string, isLive: boolean) {
  const [data, setData] = useState<ViewershipKpi[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!isLive) return

    const channel = supabase
      .channel(`viewership-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'viewership_kpis',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          setData((prev) => [...prev, payload.new as ViewershipKpi])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId, isLive])

  return data
}
