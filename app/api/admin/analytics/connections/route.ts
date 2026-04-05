
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { toPublicLocationId } from '@/lib/location-aliases'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get historical connection data for the last 24 hours
    const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const logs = await prisma.connectionLog.findMany({
      where: {
        timestamp: {
          gte: past24Hours
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    })

    // Get all active locations to ensure we have names
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    })

    // Group logs by location and time (e.g., hourly averages or just points)
    // For a 24h chart with 10min resolution, we have ~144 points. That's fine for Recharts.
    const result = locations.map(loc => {
      const locLogs = logs.filter(l => l.locationId === loc.id)
      return {
        id: toPublicLocationId(loc.id),
        name: loc.name,
        data: locLogs.map(l => ({
          time: l.timestamp.toISOString(),
          count: l.count
        }))
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Connection analytics error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
