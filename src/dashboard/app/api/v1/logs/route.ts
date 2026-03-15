export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getCommandLog } from '@/lib/db'

export async function GET(request: NextRequest) {
  const denied = await requireOwner()
  if (denied) return denied

  const CommandLog = await getCommandLog()
  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const offset = (page - 1) * limit

  const [logs, total] = await Promise.all([
    CommandLog.findAll({ order: [['createdAt', 'DESC']], limit, offset }),
    CommandLog.count(),
  ])

  // If no page param, return flat array (for overview recent logs)
  if (!searchParams.has('page')) {
    return NextResponse.json(logs)
  }

  return NextResponse.json({
    logs,
    pagination: {
      current: page,
      total: Math.ceil(total / limit),
      totalEntries: total,
    },
  })
}
