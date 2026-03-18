export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getGuild } from '@/lib/db'

const UPDATABLE_STRING_FIELDS = ['language', 'levelUpMessage', 'levelUpChannelId'] as const
type UpdatableStringField = (typeof UPDATABLE_STRING_FIELDS)[number]

const FIELD_LIMITS: Record<UpdatableStringField, number> = {
  language: 10,
  levelUpMessage: 500,
  levelUpChannelId: 20,
}

const VALID_BASE_COMMANDS = ['help', 'ping', 'info']
const HEX_COLOUR_REGEX = /^#[0-9A-Fa-f]{6}$/

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

  return NextResponse.json(guild)
}

export async function PATCH(
  request: NextRequest,
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

  const body = (await request.json()) as Record<string, unknown>
  const updates: Record<string, unknown> = {}

  for (const field of UPDATABLE_STRING_FIELDS) {
    if (!(field in body)) continue

    const value = body[field]

    // null is valid (resets to default)
    if (value === null) {
      updates[field] = null
      continue
    }

    if (typeof value !== 'string') {
      return NextResponse.json(
        { error: `${field} must be a string or null` },
        { status: 400 },
      )
    }

    const trimmed = value.trim()
    if (trimmed.length === 0) {
      updates[field] = null
      continue
    }

    if (trimmed.length > FIELD_LIMITS[field]) {
      return NextResponse.json(
        { error: `${field} must be at most ${FIELD_LIMITS[field]} characters` },
        { status: 400 },
      )
    }

    updates[field] = trimmed
  }

  if ('embedColor' in body) {
    const val = body['embedColor']

    if (val === null || val === '') {
      updates['embedColor'] = null
    } else if (typeof val !== 'string') {
      return NextResponse.json(
        { error: 'embedColor must be a hex colour string (#RRGGBB) or null' },
        { status: 400 },
      )
    } else if (!HEX_COLOUR_REGEX.test(val)) {
      return NextResponse.json(
        { error: 'embedColor must be a valid hex colour (#RRGGBB)' },
        { status: 400 },
      )
    } else {
      updates['embedColor'] = val
    }
  }

  if ('disabledCommands' in body) {
    const val = body['disabledCommands']
    if (!Array.isArray(val) || !val.every((v) => typeof v === 'string' && VALID_BASE_COMMANDS.includes(v))) {
      return NextResponse.json(
        { error: `disabledCommands must be an array of: ${VALID_BASE_COMMANDS.join(', ')}` },
        { status: 400 },
      )
    }
    updates['disabledCommands'] = [...new Set(val)]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 },
    )
  }

  await guild.update(updates)
  return NextResponse.json(guild)
}
