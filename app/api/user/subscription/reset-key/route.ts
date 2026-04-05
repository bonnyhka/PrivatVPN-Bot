import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import crypto from 'crypto'
import { buildSubscriptionUrl, createSubscriptionToken } from '@/lib/security'

export async function PATCH() {
  try {
    const session = await getSession()
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sub = await prisma.subscription.findUnique({
      where: { userId: session.userId }
    })

    if (!sub || sub.status !== 'active') {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 })
    }

    const newUuid = crypto.randomUUID()
    const linkToken = createSubscriptionToken()

    const updated = await prisma.subscription.update({
      where: { userId: session.userId },
      data: {
        vlessUuid: newUuid,
        subscriptionUrl: buildSubscriptionUrl(linkToken)
      }
    })

    // Trigger background sync to nodes
    const { triggerSync } = require('@/lib/sync')
    triggerSync()

    return NextResponse.json({
      success: true,
      vlessUuid: newUuid,
      subscriptionUrl: updated.subscriptionUrl
    })
  } catch (error) {
    console.error('Reset key error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
