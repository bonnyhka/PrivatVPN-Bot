import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { isDiagnosticsSshAuthError, readLocationDiagnosticsCache } from '@/lib/location-diagnostics'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId

    // 1. Get active devices (sessions seen in the last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const activeDevices = await prisma.activeSession.count({
      where: { 
        userId,
        lastSeen: { gte: fiveMinutesAgo }
      }
    })

    // 2. Get total traffic (sum of all user's traffic logs)
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { id: true, trafficUsed: true, createdAt: true }
    })

    const trafficLogs = await (prisma as any).trafficLog.aggregate({
      where: { subscriptionId: subscription?.id },
      _sum: { bytes: true }
    })

    const totalTrafficAllTime = Number(trafficLogs._sum?.bytes || subscription?.trafficUsed || 0)

    // 3. Calculate current node availability from diagnostics cache, not user traffic logs.
    const diagnosticsCache = readLocationDiagnosticsCache()
    const diagnosticsByLocation = diagnosticsCache.locations || {}
    const activeLocations = await prisma.location.findMany({
      where: { isActive: true },
      select: { id: true },
    })

    const totalLocations = Math.max(1, activeLocations.length)
    const healthyLocations = activeLocations.filter((location) => {
      const snapshot = diagnosticsByLocation[location.id]
      if (!snapshot) return false
      if (snapshot.isActive === false) return false
      if (snapshot.rawStatus === 'error') {
        if (isDiagnosticsSshAuthError(snapshot.error)) return true
        return false
      }
      return true
    }).length

    const uptimePercent = Number(((healthyLocations / totalLocations) * 100).toFixed(1))

    const accountAgeDays = Math.max(1, Math.ceil((Date.now() - (subscription?.createdAt?.getTime() || Date.now())) / (1000 * 60 * 60 * 24)))

    return NextResponse.json({
      activeDevices,
      totalTrafficAllTime,
      uptimePercent,
      accountAgeDays
    })
  } catch (error) {
    console.error('User stats error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
