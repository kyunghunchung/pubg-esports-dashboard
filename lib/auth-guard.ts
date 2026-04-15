import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const DEV_SKIP_AUTH = process.env.NODE_ENV === 'development'

// 개발 환경 우회용 mock 세션
const DEV_SESSION = {
  user: { email: 'dev@krafton.com', name: 'Dev User', role: 'admin' },
  expires: '2099-01-01',
}

export async function requireSession() {
  if (DEV_SKIP_AUTH) return DEV_SESSION
  const session = await getServerSession(authOptions)
  return session
}

export function getRole(session: Awaited<ReturnType<typeof requireSession>>) {
  return (session?.user as { role?: string } | undefined)?.role ?? 'viewer'
}
