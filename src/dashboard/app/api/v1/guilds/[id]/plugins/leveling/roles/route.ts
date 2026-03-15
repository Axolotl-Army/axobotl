export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getGuild, getLevelRole, getSequelize } from '@/lib/db'

const MAX_ROLES = 25
const MAX_LEVEL = 100

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireOwner()
  if (denied) return denied

  const { id } = await params
  const LevelRole = await getLevelRole()
  const roles = await LevelRole.findAll({
    where: { guildId: id },
    order: [['level', 'ASC']],
  })

  return NextResponse.json(
    roles.map((r) => ({ level: r.level, roleId: r.roleId })),
  )
}

export async function PUT(
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
  const roles = body['roles']

  if (!Array.isArray(roles)) {
    return NextResponse.json({ error: 'roles must be an array' }, { status: 400 })
  }

  if (roles.length > MAX_ROLES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_ROLES} role mappings allowed` },
      { status: 400 },
    )
  }

  const seenLevels = new Set<number>()
  for (const entry of roles) {
    const { level, roleId } = entry as Record<string, unknown>

    if (typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > MAX_LEVEL) {
      return NextResponse.json(
        { error: `Level must be an integer between 1 and ${MAX_LEVEL}` },
        { status: 400 },
      )
    }

    if (typeof roleId !== 'string' || roleId.length === 0 || roleId.length > 20) {
      return NextResponse.json(
        { error: 'roleId must be a non-empty string (max 20 chars)' },
        { status: 400 },
      )
    }

    if (seenLevels.has(level)) {
      return NextResponse.json(
        { error: `Duplicate level: ${level}` },
        { status: 400 },
      )
    }
    seenLevels.add(level)
  }

  const LevelRole = await getLevelRole()
  const sequelize = await getSequelize()

  await sequelize.transaction(async (t) => {
    await LevelRole.destroy({ where: { guildId: id }, transaction: t })
    if (roles.length > 0) {
      await LevelRole.bulkCreate(
        roles.map((r: Record<string, unknown>) => ({
          guildId: id,
          level: r['level'] as number,
          roleId: r['roleId'] as string,
        })),
        { transaction: t },
      )
    }
  })

  const updated = await LevelRole.findAll({
    where: { guildId: id },
    order: [['level', 'ASC']],
  })

  return NextResponse.json(
    updated.map((r) => ({ level: r.level, roleId: r.roleId })),
  )
}
