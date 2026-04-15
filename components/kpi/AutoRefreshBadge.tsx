'use client'

import { useEffect, useState } from 'react'

export function AutoRefreshBadge() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    setLastUpdated(new Date())
    const interval = setInterval(() => setLastUpdated(new Date()), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (!lastUpdated) return null

  const timeStr = lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  return (
    <span className="text-xs text-gray-500">
      마지막 갱신: {timeStr}
    </span>
  )
}
