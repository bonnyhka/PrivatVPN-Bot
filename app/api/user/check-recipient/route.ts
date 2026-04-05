
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { PLANS } from '@/lib/store'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp, usernameLookupSchema } from '@/lib/request-security'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 25, 10 * 60 * 1000, '/api/user/check-recipient')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const { searchParams } = new URL(req.url)
    const parsed = usernameLookupSchema.safeParse({ username: searchParams.get('username') ?? '' })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const user = await (prisma.user as any).findFirst({
      where: { username: { equals: parsed.data.username } },
      include: { subscription: true }
    })

    if (!user) return NextResponse.json({ found: false })

    const planId = user.subscription?.status === 'active' ? user.subscription.planId : null
    const plansList = PLANS.map(p => p.id)
    const level = planId ? plansList.indexOf(planId) : -1

    return NextResponse.json({
      found: true,
      currentPlanId: planId,
      level,
      expiresAt: user.subscription?.expiresAt
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
