'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/context/lang'

const NAV = [
  { href: '/dashboard',    label: 'Dashboard' },
  { href: '/contents',     label: 'Contents' },
  { href: '/co-streaming', label: 'Co-streaming' },
  { href: '/community',    label: 'Community' },
  { href: '/data-upload',  label: 'Data Upload' },
  { href: '/reports',      label: 'Reports' },
]

export function Nav() {
  const pathname = usePathname()
  const { lang, toggle } = useLang()

  return (
    <nav className="border-b border-brand-border bg-brand-surface/60 backdrop-blur-md sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-5 h-11">
        {/* 로고 */}
        <Link href="/dashboard" className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-4 rounded-full bg-brand-accent" />
          <span className="text-[11px] font-bold text-white tracking-widest uppercase">PUBG Esports</span>
        </Link>

        <div className="w-px h-4 bg-brand-border" />

        {/* 메뉴 */}
        <div className="flex items-center gap-0.5 flex-1">
          {NAV.map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative px-2.5 py-1.5 text-[13px] transition-colors duration-150',
                  active ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                )}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 left-2.5 right-2.5 h-px bg-brand-accent rounded-full" />
                )}
              </Link>
            )
          })}
        </div>

        {/* 언어 토글 */}
        <div className="flex items-center rounded-md border border-brand-border overflow-hidden text-[11px] font-semibold shrink-0">
          <button
            onClick={toggle}
            className={cn(
              'px-2.5 py-1 transition-colors',
              lang === 'ko' ? 'bg-brand-accent text-white' : 'text-gray-600 hover:text-gray-400'
            )}
          >
            KO
          </button>
          <button
            onClick={toggle}
            className={cn(
              'px-2.5 py-1 transition-colors',
              lang === 'en' ? 'bg-brand-accent text-white' : 'text-gray-600 hover:text-gray-400'
            )}
          >
            EN
          </button>
        </div>
      </div>
    </nav>
  )
}
