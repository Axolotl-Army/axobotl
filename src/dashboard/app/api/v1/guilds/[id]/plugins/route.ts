export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getGuild, getGuildPlugin } from '@/lib/db'

const PLUGIN_DEFINITIONS = [
  {
    id: 'leveling',
    name: 'Leveling',
    description: 'Track XP from messages, level up, and earn role rewards',
    defaultConfig: {
      levelUpMessage: null,
      levelUpChannelId: null,
      xpMin: 7,
      xpMax: 13,
      cooldownMs: 60000,
      xpMultiplier: 1.0,
    },
  },
]

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireOwner()
  if (denied) return denied

  const { id } = await params
  const Guild = await getGuild()
  const guild = await Guild.findByPk(id)

  if (!guild) {
    return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
  }

  const GuildPlugin = await getGuildPlugin()
  const rows = await GuildPlugin.findAll({ where: { guildId: id } })
  const rowMap = new Map(rows.map((r) => [r.pluginId, r]))

  const plugins = PLUGIN_DEFINITIONS.map((def) => {
    const row = rowMap.get(def.id)
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      enabled: row?.enabled ?? false,
      config: { ...def.defaultConfig, ...((row?.config as Record<string, unknown>) ?? {}) },
    }
  })

  return NextResponse.json(plugins)
}
