'use client'

import { useState, useEffect } from 'react'
import {
  getAllYears,
  getGlobalEventsByYear,
  getDisplayName,
} from '@/lib/config/event-master'
import { useInitEventMaster } from '@/lib/hooks/useInitEventMaster'
import { cn } from '@/lib/utils'

interface Props {
  selectedIds: string[]        // EVENT_MASTER event_id 배열
  onChange:    (ids: string[]) => void
}

export function TournamentFilter({ selectedIds, onChange }: Props) {
  useInitEventMaster()  // 마스터 로드 후 이 컴포넌트를 재렌더링
  const years = getAllYears()

  // 현재 선택된 연도 — selectedIds 첫 번째 항목 기반
  const firstYear = years.find(y =>
    getGlobalEventsByYear(y).some(e => selectedIds.includes(e.event_id))
  ) ?? years[0]
  const [year, setYear] = useState<number>(firstYear)

  // selectedIds 가 외부에서 변경되면 연도 동기화
  useEffect(() => {
    const matched = years.find(y =>
      getGlobalEventsByYear(y).some(e => selectedIds.includes(e.event_id))
    )
    if (matched && matched !== year) setYear(matched)
  }, [selectedIds]) // eslint-disable-line react-hooks/exhaustive-deps

  const yearEvents  = getGlobalEventsByYear(year)
  const yearEventIds = yearEvents.map(e => e.event_id)

  // 연도 전체 모드: 해당 연도 글로벌 이벤트 전부 선택됨
  const isYearMode =
    yearEventIds.length > 0 &&
    yearEventIds.every(id => selectedIds.includes(id)) &&
    selectedIds.length === yearEventIds.length

  function handleYearClick(y: number) {
    setYear(y)
    onChange(getGlobalEventsByYear(y).map(e => e.event_id))
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

      {/* 이벤트 버튼 (sort_order 순) */}
      <div className="flex flex-wrap gap-1.5">
        {/* 전체 버튼 */}
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
          const isSelected = !isYearMode && selectedIds.includes(e.event_id)
          return (
            <button
              key={e.event_id}
              onClick={() => handleEventClick(e.event_id)}
              className={cn(
                'px-3 py-1 rounded-lg text-sm font-medium transition-all border',
                isSelected
                  ? 'border-brand-accent bg-brand-accent/10 text-white'
                  : 'border-brand-border bg-brand-surface text-gray-400 hover:text-white hover:border-gray-500'
              )}
            >
              {getDisplayName(e.event_id)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
