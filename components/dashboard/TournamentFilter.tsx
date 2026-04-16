'use client'

import { useState, useEffect } from 'react'
import type { Event } from '@/types'
import { isGlobalEvent } from '@/lib/config/constants'
import { cn } from '@/lib/utils'

interface Props {
  events:      Event[]
  selectedIds: string[]        // 선택된 이벤트 ID 배열
  onChange:    (ids: string[]) => void
}

export function TournamentFilter({ events, selectedIds, onChange }: Props) {
  // 글로벌 대회만 표시 (없으면 전체 표시)
  const globalEvents = events.filter(e => isGlobalEvent(e.type))
  const display      = globalEvents.length > 0 ? globalEvents : events

  // 연도 목록 내림차순
  const years = Array.from(new Set(display.map(e => e.year))).sort((a, b) => b - a)

  // 현재 선택된 연도 — selectedIds 중 첫 번째 이벤트의 연도 기준
  const firstSelected = display.find(e => selectedIds.includes(e.id))
  const [year, setYear] = useState<number>(firstSelected?.year ?? years[0])

  // selectedIds가 외부에서 바뀌면 연도 동기화
  useEffect(() => {
    const ev = display.find(e => selectedIds.includes(e.id))
    if (ev && ev.year !== year) setYear(ev.year)
  }, [selectedIds]) // eslint-disable-line react-hooks/exhaustive-deps

  // 해당 연도 이벤트 (시작일 오름차순)
  const yearEvents = display
    .filter(e => e.year === year)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  const yearEventIds = yearEvents.map(e => e.id)
  // 연도 전체 선택 모드: 해당 연도 모든 이벤트가 선택됨
  const isYearMode = yearEventIds.length > 0 &&
    yearEventIds.every(id => selectedIds.includes(id)) &&
    selectedIds.length === yearEventIds.length

  function handleYearClick(y: number) {
    setYear(y)
    const ids = display
      .filter(e => e.year === y)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .map(e => e.id)
    onChange(ids)
  }

  function handleEventClick(id: string) {
    onChange([id])
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
        {/* 연도 전체 버튼 */}
        <button
          onClick={() => handleYearClick(year)}
          className={cn(
            'px-3 py-1 rounded-lg text-sm font-medium transition-all border',
            isYearMode
              ? 'border-brand-accent bg-brand-accent/10 text-white'
              : 'border-brand-border bg-brand-surface text-gray-400 hover:text-white hover:border-gray-500'
          )}
        >
          전체
        </button>

        {yearEvents.map(e => {
          const isSelected = !isYearMode && selectedIds.includes(e.id)
          return (
            <button
              key={e.id}
              onClick={() => handleEventClick(e.id)}
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
