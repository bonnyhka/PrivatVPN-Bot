import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import crypto from 'crypto'
import { finalizePayment } from '@/lib/payment-fulfillment'
import { isSuccessfulPaymentStatus } from '@/lib/payments'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const data: Record<string, string> = {}
    formData.forEach((value, key) => {
      data[key] = value.toString()
    })

    console.log('YooMoney Notification Received:', data)

    const {
      notification_type,
      operation_id,
      amount,
      currency,
      datetime,
      sender,
      codepro,
      label,
      sha1_hash
    } = data

    const secret = process.env.YOOMONEY_SECRET
    if (!secret) {
      console.error('YOOMONEY_SECRET not set')
      return new Response('Secret not set', { status: 500 })
    }

    // Verify signature
    // sha1(notification_type&operation_id&amount&currency&datetime&sender&codepro&notification_secret&label)
    const signatureSource = `${notification_type}&${operation_id}&${amount}&${currency}&${datetime}&${sender}&${codepro}&${secret}&${label}`
    const calculatedHash = crypto.createHash('sha1').update(signatureSource).digest('hex')

    if (calculatedHash !== sha1_hash) {
      console.error('Invalid YooMoney signature')
      return new Response('Invalid signature', { status: 403 })
    }

    // Find the payment record
    const payment = await prisma.payment.findUnique({
      where: { id: label },
      include: { user: { include: { subscription: true } } }
    })

    if (!payment) {
      console.error('Payment record not found for label:', label)
      return new Response('Payment not found', { status: 404 })
    }

    if (isSuccessfulPaymentStatus(payment.status)) {
      return new Response('Already processed', { status: 200 })
    }

    const receivedAmount = Number(amount)
    const expectedAmount = Number(payment.amount)
    if (!Number.isFinite(receivedAmount) || Math.abs(receivedAmount - expectedAmount) > 0.01) {
      console.error('YooMoney amount mismatch', {
        paymentId: payment.id,
        receivedAmount,
        expectedAmount,
      })
      return new Response('Amount mismatch', { status: 409 })
    }

    await finalizePayment(payment.id, {
      externalId: operation_id || `yoomoney:${payment.id}`,
      paymentStatus: 'success',
    })

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('YooMoney Notification Error:', error)
    return new Response('Internal Error', { status: 500 })
  }
}
