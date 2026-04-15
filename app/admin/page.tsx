import Link from 'next/link'

const MENU = [
  { href: '/admin/upload', icon: '↑', label: '데이터 업로드',   desc: '엑셀 파일로 과거 KPI 일괄 등록' },
  { href: '/admin/events', icon: '📅', label: '이벤트 관리',    desc: '이벤트 등록·편집 및 KPI 목표값 설정' },
  { href: '/admin/data',   icon: '✎', label: '데이터 직접 입력', desc: '카테고리별 KPI 수동 입력' },
  { href: '/admin/logs',   icon: '📋', label: '감사 로그',       desc: '데이터 수정 이력 확인' },
]

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-brand-bg text-white">
      <div className="border-b border-brand-border">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">← 대시보드</Link>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-gray-400 mt-1">데이터 관리 · 이벤트 설정 · 감사 로그</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MENU.map(({ href, icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="bg-brand-surface border border-brand-border rounded-xl p-6 hover:border-brand-accent/50 hover:bg-brand-accent/5 transition-all group"
            >
              <div className="text-2xl mb-3">{icon}</div>
              <p className="font-semibold text-white group-hover:text-brand-accent transition-colors">{label}</p>
              <p className="text-sm text-gray-400 mt-1">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
