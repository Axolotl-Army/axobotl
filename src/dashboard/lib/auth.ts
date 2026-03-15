import type { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import DiscordProvider from 'next-auth/providers/discord'

const isProduction = process.env['NODE_ENV'] === 'production'

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env['DISCORD_CLIENT_ID'] ?? '',
      clientSecret: process.env['DISCORD_CLIENT_SECRET'] ?? '',
      authorization: { params: { scope: 'identify guilds' } },
    }),
  ],
  secret: process.env['NEXTAUTH_SECRET'] ?? process.env['SESSION_SECRET'],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: isProduction
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async signIn({ profile }) {
      const ownerId = process.env['BOT_OWNER_ID']
      if (!ownerId) return false
      const discordId = (profile as Record<string, unknown>)?.id as string | undefined
      return discordId === ownerId
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.discordId = (profile as Record<string, unknown>).id as string
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).discordId = token.discordId
      }
      return session
    },
  },
}

/** Checks session + owner authorization for API routes. Returns error response or null if authorized. */
export async function requireOwner(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const discordId = (session.user as Record<string, unknown>)?.discordId as string | undefined
  const ownerId = process.env['BOT_OWNER_ID']
  if (!ownerId || discordId !== ownerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}
