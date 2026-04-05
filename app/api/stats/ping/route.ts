
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp, pingStatSchema } from '@/lib/request-security'
import { toInternalLocationId } from '@/lib/location-aliases'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 300, 10 * 60 * 1000, '/api/stats/ping')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const payload = pingStatSchema.safeParse(await req.json())
    if (!payload.success) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await (prisma as any).userPing.create({
      data: {
        userId: session.userId,
        locationId: toInternalLocationId(payload.data.locationId),
        latency: Math.round(payload.data.latency)
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ping Stats Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
