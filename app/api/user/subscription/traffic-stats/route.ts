import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sub = await prisma.subscription.findUnique({
      where: { userId: session.userId }
    })

    if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

    // Fetch last 7 days of hourly logs (168 logs)
    // Or if we want daily, we can filter/aggregate
    const logs = await (prisma as any).trafficLog.findMany({
      where: {
        subscriptionId: sub.id,
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { timestamp: 'asc' }
    })

    // Since logs now store hourly deltas, we don't need to subtract
    const usageData = logs.map((log: any) => {
      return {
        timestamp: log.timestamp,
        bytes: Number(log.bytes),
        total: 0 // We don't need the exact total here for the chart
      }
    })

    return NextResponse.json(usageData)
  } catch (error) {
    console.error('Traffic stats error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
