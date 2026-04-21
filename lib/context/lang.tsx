'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Lang, TranslationKey } from '@/lib/i18n'
import { translations } from '@/lib/i18n'

const LANG_KEY = 'pubg_lang'

interface LangContextValue {
  lang:   Lang
  toggle: () => void
  t:      (key: TranslationKey) => string
}

const LangContext = createContext<LangContextValue>({
  lang:   'ko',
  toggle: () => {},
  t:      (key) => translations.ko[key],
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ko')

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null
    if (saved === 'ko' || saved === 'en') setLang(saved)
  }, [])

  function toggle() {
    setLang(prev => {
      const next = prev === 'ko' ? 'en' : 'ko'
      localStorage.setItem(LANG_KEY, next)
      return next
    })
  }

  function t(key: TranslationKey): string {
    return translations[lang][key]
  }

  return (
    <LangContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
