export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getGuild, getGuildPlugin } from '@/lib/db'

const VALID_PLUGIN_IDS = ['leveling']

const LEVELING_CONFIG_VALIDATORS: Record<string, (v: unknown) => boolean> = {
  levelUpMessage: (v) => v === null || (typeof v === 'string' && v.length <= 500),
  levelUpChannelId: (v) => v === null || (typeof v === 'string' && v.length <= 20),
  xpMin: (v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 100,
  xpMax: (v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 100,
  cooldownMs: (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 300000,
  xpMultiplier: (v) => typeof v === 'number' && v >= 0.1 && v <= 10.0,
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pluginId: string }> },
) {
  const denied = await requireOwner()
  if (denied) return denied

  const { id, pluginId } = await params

  if (!VALID_PLUGIN_IDS.includes(pluginId)) {
    return NextResponse.json({ error: 'Invalid plugin ID' }, { status: 400 })
  }

  const Guild = await getGuild()
  const guild = await Guild.findByPk(id)
  if (!guild) {
    return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
  }

  const body = (await request.json()) as Record<string, unknown>

  const GuildPlugin = await getGuildPlugin()
  const [row] = await GuildPlugin.findOrCreate({
    where: { guildId: id, pluginId },
    defaults: { guildId: id, pluginId, enabled: false, config: {} },
  })

  // Update enabled status if provided
  if ('enabled' in body) {
    if (typeof body['enabled'] !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }
    row.enabled = body['enabled']
  }

  // Update config if provided (shallow merge)
  if ('config' in body && body['config'] !== null && typeof body['config'] === 'object') {
    const configUpdates = body['config'] as Record<string, unknown>
    const validators = LEVELING_CONFIG_VALIDATORS
    const currentConfig = (row.config as Record<string, unknown>) ?? {}

    for (const [key, value] of Object.entries(configUpdates)) {
      const validate = validators[key]
      if (!validate) {
        return NextResponse.json({ error: `Unknown config key: ${key}` }, { status: 400 })
      }
      if (!validate(value)) {
        return NextResponse.json({ error: `Invalid value for config.${key}` }, { status: 400 })
      }
      currentConfig[key] = value
    }

    // Cross-field validation: xpMin <= xpMax
    const xpMin = (currentConfig['xpMin'] as number) ?? 7
    const xpMax = (currentConfig['xpMax'] as number) ?? 13
    if (xpMin > xpMax) {
      return NextResponse.json({ error: 'xpMin must be <= xpMax' }, { status: 400 })
    }

    row.config = currentConfig
  }

  await row.save()

  return NextResponse.json({
    id: pluginId,
    enabled: row.enabled,
    config: row.config,
  })
}
