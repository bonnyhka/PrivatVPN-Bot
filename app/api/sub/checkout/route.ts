import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import crypto from 'crypto'
import { getClientIp } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'
// import { createYooKassaPayment } from '@/lib/yookassa'
import { getDynamicPlans } from '@/lib/plans'
import { validateDiscount } from '@/lib/discounts'

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
    const { planId, promoCode, months: rawMonths, isGift, isPreOrder, receiverUsername } = body
    const months = Math.max(1, parseInt(rawMonths) || 1)

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
    let basePrice = Math.floor(plan.price * months)

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
    let systemDiscount = 0
    if (isGift) {
      systemDiscount = 0.15 // 15% for gifts
    } else if (months >= 3) {
      systemDiscount = 0.10 // 10% for 3+ months
    }

    const priceAfterSystemDiscount = Math.floor(basePrice * (1 - systemDiscount))
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

    // Final price substracts remaining value if upgrading
    const finalPrice = Math.max(0, discountedPrice - remainingValue)

    // Store months in payment
    const payment = await (prisma.payment as any).create({
      data: {
        userId: user.id,
        planId: plan.id,
        months: months,
        amount: finalPrice,
        status: 'pending',
        isGift: !!isGift,
        isPreOrder: !!isPreOrder,
        receiverUsername: receiverUsername || null,
        promoCode: discountResult.discount?.code || null
      }
    })

    // Generate YooMoney URL
    const wallet = process.env.YOOMONEY_WALLET || '4100118534138676'
    const successUrl = `${process.env.WEB_APP_URL || 'https://privatevp.space'}/payment/success`
    const targets = `Оплата тарифа ${plan.name} (${months} мес) (PrivatVPN)`
    
    // Quickpay URL construction
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
      paymentId: payment.id
    })

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
