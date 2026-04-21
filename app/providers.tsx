'use client'

import { LangProvider } from '@/lib/context/lang'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return <LangProvider>{children}</LangProvider>
}
