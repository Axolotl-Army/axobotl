export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getGuild, getLevelRole, getUserLevel, getSequelize } from '@/lib/db'

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
    roles.map((r) => ({ level: r.level, roleId: r.roleId, cumulative: r.cumulative ?? false })),
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

    const cumulative = (entry as Record<string, unknown>)['cumulative']
    if (cumulative !== undefined && typeof cumulative !== 'boolean') {
      return NextResponse.json(
        { error: 'cumulative must be a boolean' },
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
          cumulative: (r['cumulative'] as boolean) ?? false,
        })),
        { transaction: t },
      )
    }
  })

  const updated = await LevelRole.findAll({
    where: { guildId: id },
    order: [['level', 'ASC']],
  })

  // Trigger retroactive cleanup for non-cumulative roles (fire-and-forget)
  const nonCumulativeRoles = updated.filter((r) => !r.cumulative)
  if (nonCumulativeRoles.length > 0) {
    void retroactiveCleanup(id, updated).catch((err) =>
      console.error('[RoleRewards] Retroactive cleanup failed:', err),
    )
  }

  return NextResponse.json(
    updated.map((r) => ({ level: r.level, roleId: r.roleId, cumulative: r.cumulative ?? false })),
  )
}

const CLEANUP_BATCH_SIZE = 10
const CLEANUP_BATCH_DELAY_MS = 1500

type RoleMapping = { level: number; roleId: string; cumulative: boolean }

async function retroactiveCleanup(
  guildId: string,
  allRoles: { level: number; roleId: string; cumulative: boolean }[],
): Promise<void> {
  const botToken = process.env['DISCORD_TOKEN']
  if (!botToken) {
    console.warn('[RoleRewards] No DISCORD_TOKEN -- skipping retroactive cleanup')
    return
  }

  const nonCumulative: RoleMapping[] = allRoles
    .filter((r) => !r.cumulative)
    .sort((a, b) => a.level - b.level)

  if (nonCumulative.length === 0) return

  // Find users who have levels in this guild
  const UserLevel = await getUserLevel()
  const users = await UserLevel.findAll({
    where: { guildId },
    attributes: ['userId', 'level'],
  })

  if (users.length === 0) return

  // For each user, determine which non-cumulative roles should be removed
  const removals: { userId: string; roleId: string }[] = []

  for (const user of users) {
    // Find the highest non-cumulative role this user has earned
    const earnedNonCum = nonCumulative.filter((r) => r.level <= user.level)
    if (earnedNonCum.length <= 1) continue // nothing to remove

    // Remove all but the highest earned non-cumulative role
    const highest = earnedNonCum[earnedNonCum.length - 1]
    for (const role of earnedNonCum) {
      if (role.roleId !== highest.roleId) {
        removals.push({ userId: user.userId, roleId: role.roleId })
      }
    }
  }

  if (removals.length === 0) return

  console.log(`[RoleRewards] Retroactive cleanup: ${removals.length} role removal(s) for guild ${guildId}`)

  // Process in batches to avoid rate limits
  for (let i = 0; i < removals.length; i += CLEANUP_BATCH_SIZE) {
    const batch = removals.slice(i, i + CLEANUP_BATCH_SIZE)
    await Promise.allSettled(
      batch.map(({ userId, roleId }) =>
        fetch(
          `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bot ${botToken}` },
          },
        ).then((res) => {
          if (!res.ok && res.status !== 404) {
            console.warn(`[RoleRewards] Failed to remove role ${roleId} from user ${userId}: ${res.status}`)
          }
        }),
      ),
    )

    // Delay between batches to respect rate limits
    if (i + CLEANUP_BATCH_SIZE < removals.length) {
      await new Promise((resolve) => setTimeout(resolve, CLEANUP_BATCH_DELAY_MS))
    }
  }
}
