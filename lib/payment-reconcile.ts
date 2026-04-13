import prisma from '@/lib/db'
import { finalizePayment } from '@/lib/payment-fulfillment'
import {
  EXPIRED_PAYMENT_STATUS,
  getEffectivePaymentStatus,
  isSuccessfulPaymentStatus,
  normalizePaymentStatus,
} from '@/lib/payments'
import {
  extractCrystalPayInvoiceId,
  getCrystalPayInvoice,
  isCrystalPayFailureState,
  isCrystalPayPaidState,
} from '@/lib/crystalpay'
import {
  extractHeleketInvoiceId,
  getHeleketInvoice,
  getHeleketPaymentStatus,
  isHeleketFailureStatus,
  isHeleketPaidStatus,
} from '@/lib/heleket'

type SubscriptionSnapshot = {
  id: string
  planId: string
  status: string
  isManual: boolean
  createdAt: Date
  updatedAt?: Date | null
}

type PaymentWithSubscription = {
  id: string
  userId: string
  planId: string
  status: string
  createdAt: Date
  externalId?: string | null
  amount: number
  balanceUsed?: number | null
  user?: { subscription?: SubscriptionSnapshot | null } | null
}

const MANUAL_PLACEHOLDER_WINDOW_MS = 24 * 60 * 60 * 1000

function isFreshManualPlaceholder(payment: PaymentWithSubscription, subscription?: SubscriptionSnapshot | null) {
  if (!subscription) return false
  if (!subscription.isManual) return false
  if (subscription.status !== 'active') return false
  if (subscription.planId !== payment.planId) return false

  const paymentCreatedAt = new Date(payment.createdAt).getTime()
  const subscriptionChangedAt = Math.max(
    new Date(subscription.updatedAt || subscription.createdAt).getTime(),
    new Date(subscription.createdAt).getTime(),
  )

  if (subscriptionChangedAt < paymentCreatedAt) return false
  return subscriptionChangedAt - paymentCreatedAt <= MANUAL_PLACEHOLDER_WINDOW_MS
}

export async function reconcilePaymentStatus(payment: PaymentWithSubscription) {
  let nextStatus = payment.status

  if (isSuccessfulPaymentStatus(nextStatus)) {
    return { status: 'success' as const, updated: false }
  }

  const balanceUsed = Number(payment.balanceUsed || 0)

  const subscription = payment.user?.subscription
  if (
    payment.amount > 0 &&
    !payment.externalId &&
    isFreshManualPlaceholder(payment, subscription)
  ) {
    await finalizePayment(payment.id, {
      externalId: subscription ? `manual:${subscription.id}` : undefined,
      paymentStatus: 'success',
    })
    return { status: 'success' as const, updated: true }
  }

  const crystalInvoiceId = extractCrystalPayInvoiceId(payment.externalId)
  if (payment.amount > 0 && crystalInvoiceId && !isSuccessfulPaymentStatus(nextStatus)) {
    try {
      const invoice = await getCrystalPayInvoice(crystalInvoiceId)
      if (isCrystalPayPaidState(invoice.state)) {
        await finalizePayment(payment.id, {
          externalId: `crystal:${invoice.id}`,
          paymentStatus: 'success',
        })
        return { status: 'success' as const, updated: true }
      }

      if (isCrystalPayFailureState(invoice.state)) {
        if (balanceUsed > 0) {
          await prisma.$transaction([
            prisma.user.update({
              where: { id: payment.userId },
              data: { balance: { increment: balanceUsed } },
            }),
            prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: 'failed',
                balanceUsed: 0,
                updatedAt: new Date(),
              },
            }),
          ])
        } else {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'failed',
              updatedAt: new Date(),
            },
          })
        }
        return { status: 'failed' as const, updated: true }
      }
    } catch (error) {
      console.error('CrystalPay status sync error:', error)
    }
  }

  const heleketInvoiceId = extractHeleketInvoiceId(payment.externalId)
  if (payment.amount > 0 && heleketInvoiceId && !isSuccessfulPaymentStatus(nextStatus)) {
    try {
      const invoice = await getHeleketInvoice(heleketInvoiceId)
      const heleketStatus = getHeleketPaymentStatus(invoice)
      if (isHeleketPaidStatus(heleketStatus)) {
        await finalizePayment(payment.id, {
          externalId: `heleket:${invoice.uuid}`,
          paymentStatus: 'success',
        })
        return { status: 'success' as const, updated: true }
      }

      if (isHeleketFailureStatus(heleketStatus)) {
        if (balanceUsed > 0) {
          await prisma.$transaction([
            prisma.user.update({
              where: { id: payment.userId },
              data: { balance: { increment: balanceUsed } },
            }),
            prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: 'failed',
                balanceUsed: 0,
                updatedAt: new Date(),
              },
            }),
          ])
        } else {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'failed',
              updatedAt: new Date(),
            },
          })
        }
        return { status: 'failed' as const, updated: true }
      }
    } catch (error) {
      console.error('Heleket status sync error:', error)
    }
  }

  const effectiveStatus = getEffectivePaymentStatus({ status: payment.status, createdAt: payment.createdAt })
  if (effectiveStatus === EXPIRED_PAYMENT_STATUS && payment.status !== EXPIRED_PAYMENT_STATUS) {
    if (balanceUsed > 0) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: payment.userId },
          data: { balance: { increment: balanceUsed } },
        }),
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: EXPIRED_PAYMENT_STATUS,
            balanceUsed: 0,
            updatedAt: new Date(),
          },
        }),
      ])
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: EXPIRED_PAYMENT_STATUS,
          updatedAt: new Date(),
        },
      })
    }
    return { status: 'expired' as const, updated: true }
  }

  return { status: normalizePaymentStatus({ status: payment.status, createdAt: payment.createdAt }) as any, updated: false }
}
