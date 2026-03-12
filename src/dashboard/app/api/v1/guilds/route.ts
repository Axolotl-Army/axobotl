export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getGuild } from '@/lib/db'

export async function GET() {
  const denied = await requireOwner()
  if (denied) return denied

  const Guild = await getGuild()
  const guilds = await Guild.findAll({ order: [['name', 'ASC']] })
  return NextResponse.json(guilds)
}
