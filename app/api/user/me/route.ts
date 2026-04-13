import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { formatUserForClient } from '@/lib/format-user'
import { reconcilePaymentStatus } from '@/lib/payment-reconcile'
import { PENDING_PAYMENT_TTL_MS, isSuccessfulPaymentStatus } from '@/lib/payments'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        subscription: true,
        referralActions: {
          include: { referred: { select: { username: true, avatar: true, firstName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: { select: { referrals: true } }
      }
    }) as any

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    try {
      const since = new Date(Date.now() - PENDING_PAYMENT_TTL_MS * 2)
      const pendingPayments = await prisma.payment.findMany({
        where: {
          userId: user.id,
          status: 'pending',
          createdAt: { gte: since },
          amount: { gt: 0 },
        },
        orderBy: { createdAt: 'desc' },
        take: 2,
        include: {
          user: {
            select: {
              subscription: {
                select: {
                  id: true,
                  planId: true,
                  status: true,
                  isManual: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      })

      let shouldRefreshUser = false
      for (const payment of pendingPayments) {
        const wasSuccess = isSuccessfulPaymentStatus(payment.status)
        const result = await reconcilePaymentStatus(payment as any)
        if (!wasSuccess && result.status === 'success') {
          shouldRefreshUser = true
        }
      }

      if (shouldRefreshUser) {
        user = await prisma.user.findUnique({
          where: { id: session.userId },
          include: {
            subscription: true,
            referralActions: {
              include: { referred: { select: { username: true, avatar: true, firstName: true } } },
              orderBy: { createdAt: 'desc' },
              take: 10
            },
            _count: { select: { referrals: true } }
          }
        }) as any
      }
    } catch (error) {
      console.error('Payment reconciliation error:', error)
    }

    const firstLocation = await prisma.location.findFirst({ where: { isActive: true } })
    if (firstLocation) {
      const { getMtprotoProxyUrl } = await import('@/lib/security')
      user.tgProxyUrl = getMtprotoProxyUrl(firstLocation.host, firstLocation.name)
    }

    return NextResponse.json({ user: formatUserForClient(user) })
  } catch (error) {
    console.error('User me error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
