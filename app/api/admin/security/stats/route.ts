import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get total logs in last 24h
    const stats = await prisma.securityLog.groupBy({
      by: ['type'],
      where: {
        createdAt: { gte: last24h }
      },
      _count: true
    })

    // Get recent logs
    const recentLogs = await prisma.securityLog.findMany({
      where: {
        createdAt: { gte: last24h }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // Get top offensive IPs
    const topIps = await prisma.securityLog.groupBy({
      by: ['ip'],
      where: {
        createdAt: { gte: last24h }
      },
      _count: true,
      orderBy: {
        _count: {
          ip: 'desc'
        }
      },
      take: 5
    })

    return NextResponse.json({
      summary: stats.reduce((acc: any, curr) => {
        acc[curr.type] = curr._count
        return acc
      }, {}),
      recentLogs,
      topIps
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Security Stats Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
