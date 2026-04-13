import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getAppHourBucket, getStartOfAppDay, getStartOfAppHour } from '@/lib/day-boundary'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SYNC_STATUS_FILE = path.resolve(process.cwd(), 'data/traffic-sync-status.json')

function readTrafficSyncStatus() {
  try {
    const raw = fs.readFileSync(SYNC_STATUS_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const currentHourStart = getStartOfAppHour(now)
    const startOfToday = getStartOfAppDay(now)

    const startOf24Hours = new Date(currentHourStart.getTime() - 23 * 60 * 60 * 1000)
    const syncStatus = readTrafficSyncStatus()

    const [totalTrafficRes, todayTrafficRes, activeConnections, activeUsers, logs] = await Promise.all([
      (prisma as any).trafficLog.aggregate({
        _sum: { bytes: true }
      }),
      (prisma as any).trafficLog.aggregate({
        where: {
          timestamp: {
            gte: startOfToday,
            lte: now,
          },
        },
        _sum: { bytes: true },
      }),
      (prisma as any).activeSession.count(),
      prisma.subscription.count({
        where: { status: 'active', expiresAt: { gt: new Date() } }
      }),
      (prisma as any).trafficLog.findMany({
        where: {
          timestamp: {
            gte: startOf24Hours,
            lte: now,
          }
        },
        orderBy: { timestamp: 'asc' }
      }),
    ])

    const totalTraffic = Number(totalTrafficRes._sum?.bytes || 0)
    const todayTraffic = Number(todayTrafficRes._sum?.bytes || 0)

    const hourlyData: Record<string, number> = {}

    for (let i = 23; i >= 0; i -= 1) {
      const bucket = new Date(currentHourStart.getTime() - i * 60 * 60 * 1000)
      hourlyData[bucket.toISOString()] = 0
    }

    logs.forEach((log: any) => {
      const key = getAppHourBucket(new Date(log.timestamp))
      hourlyData[key] = (hourlyData[key] || 0) + Number(log.bytes)
    })

    let cumulativeBytes = 0
    const chartData = Object.entries(hourlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([timestamp, bytes]) => {
        cumulativeBytes += bytes
        return {
          timestamp,
          bytes: cumulativeBytes,
          deltaBytes: bytes,
        }
      })

    console.log('[DEBUG ANALYTICS]', { totalTraffic, activeUsers, activeConnections, chartCount: chartData.length })

    return NextResponse.json({
      totalTraffic,
      todayTraffic,
      activeUsers,
      activeConnections,
      chartData,
      trafficCheckedAt: syncStatus?.completedAt || now.toISOString(),
    })
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
