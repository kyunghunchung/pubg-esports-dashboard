import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? 'krafton.com'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email ?? ''
      return email.endsWith(`@${ALLOWED_DOMAIN}`)
    },
    async session({ session, token }) {
      if (session.user) {
        // role은 추후 Supabase users 테이블에서 조회 후 주입
        (session.user as typeof session.user & { role?: string }).role = token.role as string | undefined
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = 'viewer' // default role; Phase 1에서 DB 연동
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}
