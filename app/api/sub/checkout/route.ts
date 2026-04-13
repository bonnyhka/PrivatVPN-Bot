import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getClientIp } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'
import { getDynamicPlans } from '@/lib/plans'
import { validateDiscount } from '@/lib/discounts'
import { applySystemDiscount, getPlanBasePrice } from '@/lib/payments'
import { finalizePayment } from '@/lib/payment-fulfillment'
import { createCrystalPayInvoice } from '@/lib/crystalpay'
import { createHeleketInvoice } from '@/lib/heleket'

type CheckoutMethod = 'crystalpay' | 'heleket'

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 25, 60 * 1000, '/api/sub/checkout')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
      )
    }

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { planId, promoCode, months: rawMonths, isGift, isPreOrder, receiverUsername, method: rawMethod, useBalance } = body
    const months = Math.max(1, parseInt(rawMonths) || 1)
    const method: CheckoutMethod = rawMethod === 'heleket' ? 'heleket' : 'crystalpay'

    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 })
    }

    const dynamicPlans = await getDynamicPlans()
    const plan = dynamicPlans.find((p) => p.id === planId)
    if (!plan) {
      return NextResponse.json({ error: 'Тариф не найден' }, { status: 400 })
    }

    // Fetch User & Referral Status early to calculate remaining value
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { subscription: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Pro-rata upgrade calculation
    let remainingValue = 0
    const basePrice = getPlanBasePrice(plan.id, plan.price, months)

    if (!isGift && user.subscription && user.subscription.status === 'active' && user.subscription.expiresAt.getTime() > Date.now()) {
      if (user.subscription.planId !== plan.id) {
        // Only calculate subtraction if upgrading to a DIFFERENT plan
        const oldPlan = dynamicPlans.find((p) => p.id === user.subscription!.planId)
        if (oldPlan) {
          const remainingDays = Math.max(0, (user.subscription.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          remainingValue = Math.floor(remainingDays * (oldPlan.price / 30))
        }
      }
    }

    // Phase 6 Discount Logic
    const priceAfterSystemDiscount = applySystemDiscount(basePrice, months, !!isGift)
    const discountResult = await validateDiscount({
      code: promoCode || null,
      planId,
      basePrice: priceAfterSystemDiscount,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        subscription: user.subscription ? {
          status: user.subscription.status,
          expiresAt: user.subscription.expiresAt,
        } : null,
      }
    })

    if (!discountResult.ok) {
      return NextResponse.json({ error: discountResult.error }, { status: 400 })
    }

    const discountedPrice = discountResult.discountedPrice

    // Final price subtracts remaining value if upgrading
    const finalPrice = Math.max(0, discountedPrice - remainingValue)
    const wantsBalance = Boolean(useBalance)

    const { payment, payableAmount } = await prisma.$transaction(async (tx) => {
      const freshUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { balance: true },
      })

      const availableBalance = Math.max(0, Math.floor(Number(freshUser?.balance || 0)))
      const balanceToUse = wantsBalance ? Math.min(availableBalance, finalPrice) : 0
      const payable = Math.max(0, finalPrice - balanceToUse)

      const createdPayment = await (tx.payment as any).create({
        data: {
          userId: user.id,
          planId: plan.id,
          months: months,
          amount: payable,
          balanceUsed: balanceToUse,
          status: 'pending',
          isGift: !!isGift,
          isPreOrder: !!isPreOrder,
          receiverUsername: receiverUsername || null,
          promoCode: discountResult.discount?.code || null
        }
      })

      if (balanceToUse > 0) {
        await tx.user.update({
          where: { id: user.id },
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
        where: { userId: user.id },
        select: {
          id: true,
          subscriptionUrl: true,
        },
      })

      return NextResponse.json({
        success: true,
        subscription: updatedSubscription,
        paymentId: payment.id,
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
            description: `Оплата тарифа ${plan.name} (${months} мес) - PrivatVPN`,
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
      })
    } catch (invoiceError: any) {
      console.error(`${method} invoice creation failed:`, invoiceError)
      const balanceUsed = Number((payment as any).balanceUsed || 0)
      if (balanceUsed > 0) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
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
    console.error('Checkout Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
