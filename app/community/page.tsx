'use client'

import { useLang } from '@/lib/context/lang'

export default function CommunityPage() {
  const { t } = useLang()
  return (
    <main className="min-h-screen bg-brand-bg text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-5xl">🌐</p>
        <h1 className="text-2xl font-bold">Community</h1>
        <p className="text-gray-400 text-sm max-w-sm">{t('communityDesc')}</p>
        <span className="inline-block px-3 py-1 rounded-full bg-brand-surface border border-brand-border text-xs text-gray-500">
          Coming Soon
        </span>
      </div>
    </main>
  )
}
