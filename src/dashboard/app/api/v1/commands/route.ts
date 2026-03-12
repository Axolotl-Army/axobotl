export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getSequelize } from '@/lib/db'
import { QueryTypes } from 'sequelize'

export async function GET() {
  const denied = await requireOwner()
  if (denied) return denied

  const sequelize = await getSequelize()
  const commandStats = await sequelize.query<{
    command: string
    count: string
    last_used: Date
  }>(
    `SELECT command, COUNT(*) as count, MAX("createdAt") as last_used
     FROM command_logs
     GROUP BY command
     ORDER BY count DESC`,
    { type: QueryTypes.SELECT },
  )

  return NextResponse.json(commandStats)
}
