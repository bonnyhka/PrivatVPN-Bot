import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import crypto from 'crypto'
import { buildSubscriptionUrl, createSubscriptionToken } from '@/lib/security'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { giftId } = await req.json()

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { subscription: true }
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let planId = ''
    let isTest = false

    if (giftId === 'test-gift') {
      const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID
      if (user.telegramId !== ADMIN_ID) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      planId = 'citadel'
      isTest = true
    } else {
      const gift = await prisma.gift.findUnique({
        where: { id: giftId }
      })

      if (!gift || gift.isUsed) {
        return NextResponse.json({ error: 'Invalid or already used gift' }, { status: 400 })
      }
      planId = gift.planId
      
      // Mark gift as used
      await prisma.gift.update({
        where: { id: giftId },
        data: { isUsed: true, usedAt: new Date(), toId: user.telegramId }
      })
    }

    // Update or Create Subscription
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const vlessUuid = user.subscription?.vlessUuid || crypto.randomUUID()
    const linkToken = createSubscriptionToken()

    if (user.subscription) {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: {
          planId,
          status: 'active',
          expiresAt,
          vlessUuid,
          subscriptionUrl: buildSubscriptionUrl(linkToken),
          trafficUsed: 0 // Reset traffic for new gift
        }
      })
    } else {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId,
          status: 'active',
          expiresAt,
          vlessUuid,
          subscriptionUrl: buildSubscriptionUrl(linkToken),
          trafficUsed: 0
        }
      })
    }

    return NextResponse.json({ success: true, planId, isTest })
  } catch (error) {
    console.error('Claim gift error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
