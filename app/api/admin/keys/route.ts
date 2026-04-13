import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import crypto from 'crypto'
import { buildSubscriptionUrl, createSubscriptionToken } from '@/lib/security'
import { finalizePayment, findRecentUnconfirmedPaymentForPlan } from '@/lib/payment-fulfillment'

function parseExpiryDate(input: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(`${input}T23:59:59.999Z`)
  }
  return new Date(input)
}

export async function GET() {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const keys = await prisma.subscription.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(keys.map(k => ({
      id: k.id,
      key: (k as any).subscriptionUrl,
      userId: k.userId,
      username: k.user.username || k.user.firstName || 'Unknown',
      planName: k.planId,
      status: k.status,
      isManual: k.isManual,
      isTrial: (k as any).isTrial,
      createdAt: k.createdAt.toISOString(),
      expiresAt: k.expiresAt.toISOString(),
    })))
  } catch (error) {
    console.error('Admin keys error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const { userId, planId, expiresAt } = await req.json()
    const linkToken = createSubscriptionToken()
    const vlessUuid = crypto.randomUUID()
    const parsedExpiresAt = parseExpiryDate(expiresAt)

    if (Number.isNaN(parsedExpiresAt.getTime())) {
      return NextResponse.json({ error: 'Invalid expiresAt' }, { status: 400 })
    }

    const sub = await prisma.subscription.upsert({
      where: { userId },
      update: { 
        planId, 
        status: 'active', 
        isManual: true,
        expiresAt: parsedExpiresAt,
        trafficUsed: 0,
        lastTrafficReset: new Date(),
        vlessUuid,
        subscriptionUrl: buildSubscriptionUrl(linkToken),
      },
      create: { 
        id: crypto.randomUUID(),
        userId, 
        planId, 
        status: 'active', 
        isManual: true,
        expiresAt: parsedExpiresAt, 
        autoRenew: false,
        trafficUsed: 0,
        lastTrafficReset: new Date(),
        vlessUuid,
        subscriptionUrl: buildSubscriptionUrl(linkToken),
      },
    })

    const { trafficUsed, ...restSub } = sub as any

    const pendingPayment = await findRecentUnconfirmedPaymentForPlan(userId, planId)
    if (pendingPayment) {
      await finalizePayment(pendingPayment.id, {
        externalId: `manual:${sub.id}`,
        paymentStatus: 'success',
      })
    }
    
    // Sync to servers
    require('@/lib/sync').triggerSync()
    
    return NextResponse.json({
      ...restSub,
      trafficUsed: trafficUsed.toString()
    })
  } catch (error) {
    console.error('Create key error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { keyId } = await req.json()
    await prisma.subscription.delete({ where: { id: keyId } })
    
    // Sync to servers
    require('@/lib/sync').triggerSync()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete key error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
