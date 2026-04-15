'use client'

import { useRouter } from 'next/navigation'
import type { Event } from '@/types'

interface Props {
  events: Event[]
  selectedId: string
}

const STATUS_LABEL: Record<string, string> = {
  live:      '🔴 LIVE',
  completed: '완료',
  upcoming:  '예정',
}

export function TournamentFilter({ events, selectedId }: Props) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400 whitespace-nowrap">대회 선택</span>
      <select
        value={selectedId}
        onChange={(e) => router.push(`/dashboard?event=${e.target.value}`)}
        className="bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-accent cursor-pointer"
      >
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}　{STATUS_LABEL[e.status] ?? ''}
          </option>
        ))}
      </select>
    </div>
  )
}
