import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Nav } from '@/components/Nav'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PUBG Esports 실적 대시보드',
  description: 'Krafton 이스포츠실 내부 KPI 모니터링 플랫폼',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="dark">
      <body className={`${inter.className} bg-brand-bg text-white antialiased`}>
        <Nav />
        {children}
      </body>
    </html>
  )
}
