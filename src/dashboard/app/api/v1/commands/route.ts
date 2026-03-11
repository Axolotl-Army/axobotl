export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSequelize } from '@/lib/db'
import { QueryTypes } from 'sequelize'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
