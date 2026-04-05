import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getDynamicPlans } from '@/lib/plans'
import { validateDiscount } from '@/lib/discounts'
import { buildSubscriptionLookupWhere } from '@/lib/security'
import { getClientIp } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'

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
    const { subscriptionKey, planId, promoCode, months: rawMonths } = body
    const months = Math.max(1, parseInt(rawMonths) || 1)

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

    let basePrice = Math.floor(plan.price * months)
    let remainingValue = 0

    if (subscription.status === 'active' && subscription.expiresAt.getTime() > Date.now() && subscription.planId !== plan.id) {
      const oldPlan = dynamicPlans.find(item => item.id === subscription.planId)
      if (oldPlan) {
        const remainingDays = Math.max(0, (subscription.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        remainingValue = Math.floor(remainingDays * (oldPlan.price / 30))
      }
    }

    let systemDiscount = 0
    if (months >= 3) systemDiscount = 0.1

    const priceAfterSystemDiscount = Math.floor(basePrice * (1 - systemDiscount))
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

    const payment = await (prisma.payment as any).create({
      data: {
        userId: subscription.userId,
        planId: plan.id,
        months,
        amount: finalPrice,
        status: 'pending',
        promoCode: discountResult.discount?.code || null,
      },
    })

    const wallet = process.env.YOOMONEY_WALLET || '4100118534138676'
    const successUrl = `${process.env.WEB_APP_URL || 'https://privatevp.space'}/payment/success`
    const targets = `Оплата тарифа ${plan.name} (${months} мес) (PrivatVPN Desktop)`

    const yoomoneyUrl = new URL('https://yoomoney.ru/quickpay/confirm.xml')
    yoomoneyUrl.searchParams.append('receiver', wallet)
    yoomoneyUrl.searchParams.append('quickpay-form', 'button')
    yoomoneyUrl.searchParams.append('targets', targets)
    yoomoneyUrl.searchParams.append('paymentType', 'PC')
    yoomoneyUrl.searchParams.append('sum', finalPrice.toString())
    yoomoneyUrl.searchParams.append('label', payment.id)
    yoomoneyUrl.searchParams.append('successURL', successUrl)

    return NextResponse.json({
      success: true,
      paymentUrl: yoomoneyUrl.toString(),
      paymentId: payment.id,
      amount: finalPrice,
    })
  } catch (error: any) {
    console.error('Desktop checkout error:', error)
    return NextResponse.json({
      error: 'Internal Server Error',
      message: error?.message,
    }, { status: 500 })
  }
}
