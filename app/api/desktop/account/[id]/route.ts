import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getDynamicPlans } from '@/lib/plans'
import { buildSubscriptionLookupWhere } from '@/lib/security'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing subscription key' }, { status: 400 })
    }

    const subscription = await prisma.subscription.findFirst({
      where: buildSubscriptionLookupWhere(id),
      include: {
        user: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const plans = await getDynamicPlans()
    const plan = plans.find(item => item.id === subscription.planId)
    const isExpired = new Date(subscription.expiresAt).getTime() < Date.now()
    const status = subscription.status !== 'active' || isExpired ? 'expired' : 'active'

    return NextResponse.json({
      account: {
        key: subscription.id,
        status,
        canConnect: status === 'active',
        planId: subscription.planId,
        planName: plan?.name || subscription.planId,
        expiresAt: subscription.expiresAt.toISOString(),
        trafficUsed: Number(subscription.trafficUsed || 0),
        trafficTotal: plan?.trafficLimit === Number.MAX_SAFE_INTEGER ? null : Number(plan?.trafficLimit || 0),
        displayName: subscription.user?.firstName
          ? `${subscription.user.firstName} ${subscription.user.lastName || ''}`.trim()
          : subscription.user?.username || 'PrivatVPN User',
        username: subscription.user?.username || null,
        avatar: subscription.user?.avatar || null,
        subscriptionUrl: subscription.subscriptionUrl,
        createdAt: subscription.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Desktop account error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
