'use client'

import { useState, useEffect } from 'react'
import type { Event } from '@/types'
import { isGlobalEvent } from '@/lib/config/constants'
import { cn } from '@/lib/utils'

interface Props {
  events:     Event[]
  selectedId: string
  onChange:   (id: string) => void
}

export function TournamentFilter({ events, selectedId, onChange }: Props) {
  // 글로벌 대회만 표시 (없으면 전체 표시)
  const globalEvents = events.filter(e => isGlobalEvent(e.type))
  const display      = globalEvents.length > 0 ? globalEvents : events

  // 연도 목록 내림차순
  const years = Array.from(new Set(display.map(e => e.year))).sort((a, b) => b - a)

  // 현재 선택된 이벤트의 연도를 기본값으로
  const selectedEvent = display.find(e => e.id === selectedId)
  const [year, setYear] = useState<number>(selectedEvent?.year ?? years[0])

  // selectedId가 외부에서 바뀌면 연도 동기화
  useEffect(() => {
    const ev = display.find(e => e.id === selectedId)
    if (ev && ev.year !== year) setYear(ev.year)
  }, [selectedId])  // eslint-disable-line react-hooks/exhaustive-deps

  // 해당 연도 이벤트 (시작일 오름차순)
  const yearEvents = display
    .filter(e => e.year === year)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  function handleYearClick(y: number) {
    setYear(y)
    const first = display
      .filter(e => e.year === y)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0]
    if (first) onChange(first.id)
  }

  return (
    <div className="space-y-2">
      {/* 연도 탭 */}
      <div className="flex gap-1.5">
        {years.map(y => (
          <button
            key={y}
            onClick={() => handleYearClick(y)}
            className={cn(
              'px-3 py-1 rounded-lg text-sm font-semibold transition-all',
              year === y
                ? 'bg-brand-accent text-white'
                : 'bg-brand-surface border border-brand-border text-gray-400 hover:text-white hover:border-gray-500'
            )}
          >
            {y}
          </button>
        ))}
      </div>

      {/* 이벤트 버튼 */}
      <div className="flex flex-wrap gap-1.5">
        {yearEvents.map(e => {
          const isSelected = selectedId === e.id
          return (
            <button
              key={e.id}
              onClick={() => onChange(e.id)}
              className={cn(
                'px-3 py-1 rounded-lg text-sm font-medium transition-all border',
                isSelected
                  ? 'border-brand-accent bg-brand-accent/10 text-white'
                  : 'border-brand-border bg-brand-surface text-gray-400 hover:text-white hover:border-gray-500',
                e.status === 'live'     && 'border-kpi-live/50',
                e.status === 'upcoming' && !isSelected && 'border-brand-accent/30 text-brand-accent/70',
              )}
            >
              {e.status === 'live'     && <span className="text-kpi-live mr-1">●</span>}
              {e.status === 'upcoming' && <span className="text-brand-accent/60 mr-1">○</span>}
              {e.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
