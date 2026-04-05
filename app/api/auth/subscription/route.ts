import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { createSession } from '@/lib/auth'
import { buildSubscriptionLookupWhere } from '@/lib/security'
import { getClientIp } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 20, 60 * 1000, '/api/auth/subscription')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
      )
    }

    const body = await req.json().catch(() => ({}))
    const link = String(body?.subscriptionLink || body?.link || '').trim()
    if (!link) {
      return NextResponse.json({ error: 'Missing subscriptionLink' }, { status: 400 })
    }

    const subscription = await prisma.subscription.findFirst({
      where: buildSubscriptionLookupWhere(link) as any,
      include: { user: true },
    })

    if (!subscription?.user) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    if (subscription.user.role !== 'admin' && subscription.user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await createSession(subscription.user.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Subscription auth error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

