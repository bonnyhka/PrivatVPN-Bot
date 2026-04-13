import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { finalizePayment } from '@/lib/payment-fulfillment'
import { isSuccessfulPaymentStatus } from '@/lib/payments'
import {
  getHeleketPaymentStatus,
  isHeleketFailureStatus,
  isHeleketPaidStatus,
  isHeleketPendingStatus,
  isHeleketSignatureValid,
} from '@/lib/heleket'

type HeleketWebhookPayload = {
  uuid?: string
  order_id?: string
  status?: string
  payment_status?: string
  sign?: string
  additional_data?: string | null
  merchant_amount?: string | null
  amount?: string | null
  currency?: string | null
  payer_currency?: string | null
}

export async function POST(req: Request) {
  try {
    const payload = await req.json() as HeleketWebhookPayload
    const invoiceId = String(payload?.uuid || '')
    const orderId = String(payload?.order_id || '')
    const signature = payload?.sign
    const status = getHeleketPaymentStatus(payload)

    if (!invoiceId && !orderId) {
      return NextResponse.json({ error: 'Missing uuid or order_id' }, { status: 400 })
    }

    if (!isHeleketSignatureValid(payload as Record<string, unknown>, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    let payment = null

    if (orderId) {
      payment = await prisma.payment.findUnique({ where: { id: orderId } })
    }

    if (!payment && invoiceId) {
      payment = await prisma.payment.findUnique({
        where: { externalId: `heleket:${invoiceId}` },
      })
    }

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (isSuccessfulPaymentStatus(payment.status)) {
      return NextResponse.json({ ok: true, status: 'already_processed' })
    }

    if (isHeleketPaidStatus(status)) {
      await finalizePayment(payment.id, {
        externalId: `heleket:${invoiceId}`,
        paymentStatus: 'success',
      })

      return NextResponse.json({ ok: true, status: 'success' })
    }

    if (isHeleketFailureStatus(status)) {
      const balanceUsed = Number((payment as any).balanceUsed || 0)
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
              externalId: payment.externalId || `heleket:${invoiceId}`,
              updatedAt: new Date(),
            },
          }),
        ])
      } else {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'failed',
            externalId: payment.externalId || `heleket:${invoiceId}`,
            updatedAt: new Date(),
          },
        })
      }

      return NextResponse.json({ ok: true, status: 'failed' })
    }

    if (isHeleketPendingStatus(status)) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalId: payment.externalId || `heleket:${invoiceId}`,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ ok: true, status: 'pending' })
    }

    return NextResponse.json({ ok: true, status: 'ignored' })
  } catch (error) {
    console.error('Heleket notification error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
