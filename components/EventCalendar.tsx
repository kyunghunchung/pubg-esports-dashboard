import { cn } from '@/lib/utils'
import type { Event } from '@/types'

interface Props {
  events: Event[]
}

const STATUS_STYLE = {
  live:      'bg-kpi-live/20 border-kpi-live/50 text-kpi-live',
  completed: 'bg-gray-800 border-gray-700 text-gray-300',
  upcoming:  'bg-brand-accent/10 border-brand-accent/30 text-brand-accent',
}

const STATUS_LABEL = {
  live:      'LIVE',
  completed: '완료',
  upcoming:  '예정',
}

const TYPE_COLOR: Record<string, string> = {
  PGC:  'bg-yellow-500/20 text-yellow-400',
  PNC:  'bg-blue-500/20 text-blue-400',
  PGS:  'bg-purple-500/20 text-purple-400',
  GOTF: 'bg-orange-500/20 text-orange-400',
  EWC:  'bg-green-500/20 text-green-400',
  ENC:  'bg-pink-500/20 text-pink-400',
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  return `${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`
}

export function EventCalendar({ events }: Props) {
  const byYear = events.reduce<Record<number, Event[]>>((acc, ev) => {
    ;(acc[ev.year] ??= []).push(ev)
    return acc
  }, {})

  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  return (
    <div className="space-y-6">
      {years.map((year) => (
        <div key={year}>
          <h3 className="text-sm font-semibold text-gray-400 mb-3">{year}</h3>
          <div className="space-y-2">
            {byYear[year]
              .sort((a, b) => a.start_date.localeCompare(b.start_date))
              .map((ev) => (
                <div
                  key={ev.id}
                  className={cn(
                    'flex items-center justify-between px-4 py-3 rounded-lg border',
                    STATUS_STYLE[ev.status]
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded', TYPE_COLOR[ev.type] ?? 'bg-gray-700 text-gray-300')}>
                      {ev.type}
                    </span>
                    <div>
                      <p className="font-medium text-white text-sm">{ev.name}</p>
                      {ev.venue && <p className="text-xs text-gray-400">{ev.venue}</p>}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="text-xs text-gray-400">{formatDateRange(ev.start_date, ev.end_date)}</span>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', STATUS_STYLE[ev.status])}>
                      {STATUS_LABEL[ev.status]}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
