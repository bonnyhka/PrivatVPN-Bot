import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getPaymentExpiresAt } from '@/lib/payments'
import { reconcilePaymentStatus } from '@/lib/payment-reconcile'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Missing payment id' }, { status: 400 })
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        planId: true,
        status: true,
        createdAt: true,
        externalId: true,
        amount: true,
        balanceUsed: true,
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
      }
    })

    if (!payment) {
      return NextResponse.json({ status: 'not_found' }, { status: 404 })
    }

    const { status } = await reconcilePaymentStatus(payment as any)

    return NextResponse.json({
      id: payment.id,
      status,
      createdAt: payment.createdAt.toISOString(),
      expiresAt: getPaymentExpiresAt(payment.createdAt).toISOString(),
    })
  } catch (error) {
    console.error('Payment status error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
