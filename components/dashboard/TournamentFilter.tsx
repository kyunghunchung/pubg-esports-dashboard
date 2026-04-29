'use client'

import { useState, useEffect } from 'react'
import {
  getAllYears,
  getGlobalEventsByYear,
  getDisplayName,
} from '@/lib/config/event-master'
import { useInitEventMaster } from '@/lib/hooks/useInitEventMaster'
import { useLang } from '@/lib/context/lang'
import { cn } from '@/lib/utils'

interface Props {
  selectedIds: string[]
  onChange:    (ids: string[]) => void
}

export function TournamentFilter({ selectedIds, onChange }: Props) {
  useInitEventMaster()
  const { t } = useLang()
  const years = getAllYears()

  const firstYear = years.find(y =>
    getGlobalEventsByYear(y).some(e => selectedIds.includes(e.event_id))
  ) ?? years[0]
  const [year, setYear] = useState<number>(firstYear)

  useEffect(() => {
    const matched = years.find(y =>
      getGlobalEventsByYear(y).some(e => selectedIds.includes(e.event_id))
    )
    if (matched && matched !== year) setYear(matched)
  }, [selectedIds]) // eslint-disable-line react-hooks/exhaustive-deps

  const yearEvents   = getGlobalEventsByYear(year)
  const yearEventIds = yearEvents.map(e => e.event_id)

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
      <div className="flex gap-1">
        {years.map(y => (
          <button
            key={y}
            onClick={() => handleYearClick(y)}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
              year === y
                ? 'bg-brand-accent text-white shadow-sm'
                : 'bg-brand-surface border border-brand-border text-gray-500 hover:text-gray-300 hover:border-brand-accent/40'
            )}
          >
            {y}
          </button>
        ))}
      </div>

      {/* 이벤트 칩 */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => handleYearClick(year)}
          className={cn(
            'px-2.5 py-0.5 rounded-md text-xs font-medium transition-all border',
            isYearMode
              ? 'border-brand-accent/60 bg-brand-accent/10 text-blue-300'
              : 'border-brand-border bg-brand-surface text-gray-500 hover:text-gray-300 hover:border-brand-accent/40'
          )}
        >
          {t('all')}
        </button>

        {yearEvents.map(e => {
          const isSelected = !isYearMode && selectedIds.includes(e.event_id)
          return (
            <button
              key={e.event_id}
              onClick={() => handleEventClick(e.event_id)}
              className={cn(
                'px-2.5 py-0.5 rounded-md text-xs font-medium transition-all border',
                isSelected
                  ? 'border-brand-accent/60 bg-brand-accent/10 text-blue-300'
                  : 'border-brand-border bg-brand-surface text-gray-500 hover:text-gray-300 hover:border-brand-accent/40'
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
