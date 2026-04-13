import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getDynamicPlans } from '@/lib/plans'
import { validateDiscount } from '@/lib/discounts'
import { buildSubscriptionLookupWhere } from '@/lib/security'
import { getClientIp } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'
import { applySystemDiscount, getPlanBasePrice } from '@/lib/payments'
import { finalizePayment } from '@/lib/payment-fulfillment'
import { createCrystalPayInvoice } from '@/lib/crystalpay'
import { createHeleketInvoice } from '@/lib/heleket'

type CheckoutMethod = 'crystalpay' | 'heleket'

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 20, 60 * 1000, '/api/desktop/checkout')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
      )
    }

    const body = await req.json()
    const { subscriptionKey, planId, promoCode, months: rawMonths, method: rawMethod, useBalance } = body
    const months = Math.max(1, parseInt(rawMonths) || 1)
    const method: CheckoutMethod = rawMethod === 'heleket' ? 'heleket' : 'crystalpay'

    if (!subscriptionKey || !planId) {
      return NextResponse.json({ error: 'Missing subscriptionKey or planId' }, { status: 400 })
    }

    const subscription = await prisma.subscription.findFirst({
      where: buildSubscriptionLookupWhere(subscriptionKey),
      include: {
        user: true,
      },
    })

    if (!subscription?.user) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const dynamicPlans = await getDynamicPlans()
    const plan = dynamicPlans.find(item => item.id === planId)
    if (!plan) {
      return NextResponse.json({ error: 'Тариф не найден' }, { status: 400 })
    }

    const basePrice = getPlanBasePrice(plan.id, plan.price, months)
    let remainingValue = 0

    if (subscription.status === 'active' && subscription.expiresAt.getTime() > Date.now() && subscription.planId !== plan.id) {
      const oldPlan = dynamicPlans.find(item => item.id === subscription.planId)
      if (oldPlan) {
        const remainingDays = Math.max(0, (subscription.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        remainingValue = Math.floor(remainingDays * (oldPlan.price / 30))
      }
    }

    const priceAfterSystemDiscount = applySystemDiscount(basePrice, months, false)
    const discountResult = await validateDiscount({
      code: promoCode || null,
      planId,
      basePrice: priceAfterSystemDiscount,
      user: {
        id: subscription.user.id,
        telegramId: subscription.user.telegramId,
        username: subscription.user.username,
        subscription: {
          status: subscription.status,
          expiresAt: subscription.expiresAt,
        },
      },
    })

    if (!discountResult.ok) {
      return NextResponse.json({ error: discountResult.error }, { status: 400 })
    }

    const discountedPrice = discountResult.discountedPrice
    const finalPrice = Math.max(0, discountedPrice - remainingValue)
    const wantsBalance = Boolean(useBalance)

    const { payment, payableAmount } = await prisma.$transaction(async (tx) => {
      const freshUser = await tx.user.findUnique({
        where: { id: subscription.userId },
        select: { balance: true },
      })

      const availableBalance = Math.max(0, Math.floor(Number(freshUser?.balance || 0)))
      const balanceToUse = wantsBalance ? Math.min(availableBalance, finalPrice) : 0
      const payable = Math.max(0, finalPrice - balanceToUse)

      const createdPayment = await (tx.payment as any).create({
        data: {
          userId: subscription.userId,
          planId: plan.id,
          months,
          amount: payable,
          balanceUsed: balanceToUse,
          status: 'pending',
          promoCode: discountResult.discount?.code || null,
        },
      })

      if (balanceToUse > 0) {
        await tx.user.update({
          where: { id: subscription.userId },
          data: { balance: { decrement: balanceToUse } },
        })
      }

      return { payment: createdPayment, payableAmount: payable }
    })

    if (payableAmount <= 0) {
      await finalizePayment(payment.id, {
        externalId: `internal:${payment.id}`,
        paymentStatus: 'success',
      })

      const updatedSubscription = await prisma.subscription.findUnique({
        where: { userId: subscription.userId },
        select: {
          id: true,
          subscriptionUrl: true,
        },
      })

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        amount: payableAmount,
        subscription: updatedSubscription,
      })
    }

    const successUrl = new URL(`${process.env.WEB_APP_URL || 'https://privatevp.space'}/payment/success`)
    successUrl.searchParams.set('paymentId', payment.id)
    const callbackPath = method === 'heleket'
      ? '/api/payment/heleket/notification'
      : '/api/payment/crystalpay/notification'
    const callbackUrl = new URL(`${process.env.WEB_APP_URL || 'https://privatevp.space'}${callbackPath}`)

    try {
      const invoice = method === 'heleket'
          ? await createHeleketInvoice({
            amount: payableAmount,
            orderId: payment.id,
            successUrl: successUrl.toString(),
            returnUrl: `${process.env.WEB_APP_URL || 'https://privatevp.space'}/`,
            callbackUrl: callbackUrl.toString(),
            additionalData: payment.id,
            lifetimeSeconds: 60 * 60,
          })
        : await createCrystalPayInvoice({
            amount: payableAmount,
            description: `Оплата тарифа ${plan.name} (${months} мес) - PrivatVPN Desktop`,
            redirectUrl: successUrl.toString(),
            callbackUrl: callbackUrl.toString(),
            extra: payment.id,
            lifetimeMinutes: 60,
          })

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalId: `${method === 'heleket' ? 'heleket' : 'crystal'}:${invoice.id}`,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        paymentUrl: invoice.url,
        paymentId: payment.id,
        amount: payableAmount,
      })
    } catch (invoiceError: any) {
      console.error(`Desktop ${method} invoice error:`, invoiceError)
      const balanceUsed = Number((payment as any).balanceUsed || 0)
      if (balanceUsed > 0) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: subscription.userId },
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

      return NextResponse.json({
        error: `Не удалось создать счёт ${method === 'heleket' ? 'Heleket' : 'CrystalPay'}`,
        message: invoiceError?.message,
      }, { status: 502 })
    }
  } catch (error: any) {
    console.error('Desktop checkout error:', error)
    return NextResponse.json({
      error: 'Internal Server Error',
      message: error?.message,
    }, { status: 500 })
  }
}
