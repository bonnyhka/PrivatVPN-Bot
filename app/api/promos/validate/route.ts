import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getDynamicPlans } from '@/lib/plans'
import { validateDiscount } from '@/lib/discounts'
import { getClientIp } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'
import { applySystemDiscount, getPlanBasePrice, getSystemDiscountRate } from '@/lib/payments'

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 90, 60 * 1000, '/api/promos/validate')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
      )
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')?.trim().toUpperCase()
    const planId = searchParams.get('planId')
    const months = Math.max(1, parseInt(searchParams.get('months') || '1') || 1)
    const isGift = searchParams.get('isGift') === '1' || searchParams.get('isGift') === 'true'

    if (!planId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const session = await getSession()
    const user = session?.userId ? await prisma.user.findUnique({
      where: { id: session.userId },
      include: { subscription: true }
    }) : null

    const plans = await getDynamicPlans()
    const plan = plans.find((item) => item.id === planId)
    if (!plan) {
      return NextResponse.json({ error: 'Тариф не найден' }, { status: 400 })
    }

    const basePrice = getPlanBasePrice(plan.id, plan.price, months)
    const systemDiscount = getSystemDiscountRate(months, isGift)
    const priceAfterSystemDiscount = applySystemDiscount(basePrice, months, isGift)
    const result = await validateDiscount({
      code,
      planId,
      basePrice: priceAfterSystemDiscount,
      user: user ? {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        subscription: user.subscription ? {
          status: user.subscription.status,
          expiresAt: user.subscription.expiresAt,
        } : null,
      } : null,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: code ? 400 : 200 })
    }

    return NextResponse.json({
      promo: result.mapped,
      discountedPrice: result.discountedPrice,
      auto: !code && !!result.mapped,
      basePrice,
      priceAfterSystemDiscount,
      systemDiscount,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
