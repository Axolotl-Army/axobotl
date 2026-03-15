export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'

type DiscordRole = {
  id: string
  name: string
  color: number
  position: number
  managed: boolean
}

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

  const res = await fetch(`https://discord.com/api/v10/guilds/${id}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 502 })
  }

  const roles: DiscordRole[] = await res.json()
  const assignableRoles = roles
    .filter((r) => !r.managed && r.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .map((r) => ({ id: r.id, name: r.name, color: r.color }))

  return NextResponse.json(assignableRoles)
}
