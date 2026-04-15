'use client'

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-kpi-live/20 text-kpi-live text-xs font-bold uppercase tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-kpi-live animate-pulse" />
      LIVE
    </span>
  )
}
