'use client'

import type { Event } from '@/types'

interface Props {
  events:     Event[]
  selectedId: string
  onChange:   (id: string) => void
}

const STATUS_DOT: Record<string, string> = {
  live:      '🔴 ',
  completed: '',
  upcoming:  '🔵 ',
}

export function TournamentFilter({ events, selectedId, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400 whitespace-nowrap">대회 선택</span>
      <select
        value={selectedId}
        onChange={e => onChange(e.target.value)}
        className="bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-accent cursor-pointer"
      >
        {events.map(e => (
          <option key={e.id} value={e.id}>
            {STATUS_DOT[e.status] ?? ''}{e.name}
          </option>
        ))}
      </select>
    </div>
  )
}
