export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'

type DiscordChannel = {
  id: string
  name: string
  type: number
  position: number
  parent_id: string | null
}

// Discord channel types: 0 = text, 5 = announcement
const TEXT_CHANNEL_TYPES = [0, 5]

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireOwner()
  if (denied) return denied

  const { id } = await params
  const botToken = process.env['DISCORD_TOKEN']

  if (!botToken) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 })
  }

  const res = await fetch(`https://discord.com/api/v10/guilds/${id}/channels`, {
    headers: { Authorization: `Bot ${botToken}` },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 502 })
  }

  const channels: DiscordChannel[] = await res.json()
  const textChannels = channels
    .filter((ch) => TEXT_CHANNEL_TYPES.includes(ch.type))
    .sort((a, b) => a.position - b.position)
    .map((ch) => ({ id: ch.id, name: ch.name }))

  return NextResponse.json(textChannels)
}
