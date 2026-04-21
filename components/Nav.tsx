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
    <nav className="border-b border-brand-border bg-brand-surface/50 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-6 h-12">
        <span className="text-xs font-bold text-brand-accent tracking-widest uppercase">PUBG Esports</span>
        <div className="flex items-center gap-1 flex-1">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-all',
                pathname.startsWith(href)
                  ? 'text-white bg-white/10'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* 언어 토글 */}
        <button
          onClick={toggle}
          className="flex items-center gap-0 rounded-lg border border-brand-border overflow-hidden text-xs font-semibold shrink-0"
        >
          <span className={cn(
            'px-2.5 py-1 transition-colors',
            lang === 'ko' ? 'bg-brand-accent text-white' : 'text-gray-500 hover:text-gray-300'
          )}>
            KO
          </span>
          <span className={cn(
            'px-2.5 py-1 transition-colors',
            lang === 'en' ? 'bg-brand-accent text-white' : 'text-gray-500 hover:text-gray-300'
          )}>
            EN
          </span>
        </button>
      </div>
    </nav>
  )
}
