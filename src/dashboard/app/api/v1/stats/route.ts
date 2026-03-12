export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getGuild, getCommandLog } from '@/lib/db'

export async function GET() {
  const denied = await requireOwner()
  if (denied) return denied

  const [Guild, CommandLog] = await Promise.all([getGuild(), getCommandLog()])
  const [guildCount, totalCommands] = await Promise.all([
    Guild.count(),
    CommandLog.count(),
  ])

  return NextResponse.json({ guildCount, totalCommands })
}
