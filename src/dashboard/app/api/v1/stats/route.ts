export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGuild, getCommandLog } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [Guild, CommandLog] = await Promise.all([getGuild(), getCommandLog()])
  const [guildCount, totalCommands] = await Promise.all([
    Guild.count(),
    CommandLog.count(),
  ])

  return NextResponse.json({ guildCount, totalCommands })
}
