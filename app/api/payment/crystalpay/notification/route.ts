import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { finalizePayment } from '@/lib/payment-fulfillment'
import { isSuccessfulPaymentStatus } from '@/lib/payments'
import {
  isCrystalPayFailureState,
  isCrystalPayPaidState,
  isCrystalPayPendingState,
  isCrystalPaySignatureValid,
} from '@/lib/crystalpay'

type CrystalPayCallbackPayload = {
  id?: string
  state?: string
  signature?: string
  extra?: string | null
  rub_amount?: string
  amount?: string
}

export async function POST(req: Request) {
  try {
    const data = await req.json() as CrystalPayCallbackPayload
    const invoiceId = String(data?.id || '')
    const state = String(data?.state || '')

    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 })
    }

    if (!isCrystalPaySignatureValid(invoiceId, data?.signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    let payment = null

    if (data?.extra) {
      payment = await prisma.payment.findUnique({
        where: { id: String(data.extra) },
      })
    }

    if (!payment) {
      payment = await prisma.payment.findUnique({
        where: { externalId: `crystal:${invoiceId}` },
      })
    }

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (isSuccessfulPaymentStatus(payment.status)) {
      return NextResponse.json({ ok: true, status: 'already_processed' })
    }

    if (isCrystalPayPaidState(state)) {
      await finalizePayment(payment.id, {
        externalId: `crystal:${invoiceId}`,
        paymentStatus: 'success',
      })

      return NextResponse.json({ ok: true, status: 'success' })
    }

    if (isCrystalPayFailureState(state)) {
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
              externalId: payment.externalId || `crystal:${invoiceId}`,
              updatedAt: new Date(),
            },
          }),
        ])
      } else {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'failed',
            externalId: payment.externalId || `crystal:${invoiceId}`,
            updatedAt: new Date(),
          },
        })
      }

      return NextResponse.json({ ok: true, status: 'failed' })
    }

    if (isCrystalPayPendingState(state)) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalId: payment.externalId || `crystal:${invoiceId}`,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ ok: true, status: 'pending' })
    }

    return NextResponse.json({ ok: true, status: 'ignored' })
  } catch (error) {
    console.error('CrystalPay notification error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
