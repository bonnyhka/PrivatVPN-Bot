import prisma from '@/lib/db'
import { sendTelegramMessage } from '@/lib/telegram'

type DiscountRecord = {
  id: string
  code: string
  createdAt?: Date
  mode?: string | null
  delivery?: string | null
  audience?: string | null
  type: string
  value: number
  compensationDays?: number | null
  minPurchase?: number | null
  usageLimit?: number | null
  usageCount: number
  validFrom: Date
  validTo: Date
  applicablePlans: string
  isActive: boolean
  description?: string | null
  targetUsers?: string | null
  broadcastText?: string | null
  lastBroadcastAt?: Date | null
  lastAppliedAt?: Date | null
}

type UserContext = {
  id: string
  telegramId?: string | null
  username?: string | null
  subscription?: {
    status: string
    expiresAt: Date
  } | null
}

export function mapDiscount(discount: DiscountRecord) {
  return {
    id: discount.id,
    code: discount.code,
    mode: (discount.mode || 'promo') as 'promo' | 'global' | 'compensation',
    delivery: (discount.delivery || 'code') as 'code' | 'auto' | 'broadcast',
    audience: (discount.audience || 'all') as 'all' | 'active' | 'expired' | 'paid' | 'custom',
    type: discount.type as 'percent' | 'fixed',
    value: Number(discount.value || 0),
    compensationDays: discount.compensationDays == null ? undefined : Number(discount.compensationDays),
    minPurchase: discount.minPurchase == null ? undefined : Number(discount.minPurchase),
    maxUses: discount.usageLimit == null ? undefined : Number(discount.usageLimit),
    usedCount: Number(discount.usageCount || 0),
    validFrom: discount.validFrom.toISOString(),
    validTo: discount.validTo.toISOString(),
    applicablePlans: discount.applicablePlans === 'all'
      ? 'all'
      : discount.applicablePlans.split(',').map((item) => item.trim()).filter(Boolean),
    isActive: !!discount.isActive,
    description: discount.description || undefined,
    targetUsers: discount.targetUsers || undefined,
    broadcastText: discount.broadcastText || undefined,
    lastBroadcastAt: discount.lastBroadcastAt?.toISOString() || null,
    lastAppliedAt: discount.lastAppliedAt?.toISOString() || null,
  }
}

function parseTargetUsers(value?: string | null) {
  if (!value) return []
  return value
    .split(/[\n, ]+/)
    .map((item) => item.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean)
}

async function matchesAudience(discount: DiscountRecord, user?: UserContext | null) {
  const audience = discount.audience || 'all'
  if (audience === 'all') return true
  if (!user) return false

  const isActiveSub = !!(user.subscription && user.subscription.status === 'active' && user.subscription.expiresAt.getTime() > Date.now())

  if (audience === 'active') return isActiveSub
  if (audience === 'expired') return !isActiveSub

  if (audience === 'paid') {
    const paymentsCount = await prisma.payment.count({
      where: { userId: user.id, status: 'success' }
    })
    return paymentsCount > 0
  }

  if (audience === 'custom') {
    const targets = parseTargetUsers(discount.targetUsers)
    if (targets.length === 0) return false
    const username = user.username?.toLowerCase() || ''
    return targets.includes(user.id.toLowerCase()) || targets.includes(String(user.telegramId || '').toLowerCase()) || (!!username && targets.includes(username))
  }

  return false
}

function matchesPlan(discount: DiscountRecord, planId: string) {
  if (discount.applicablePlans === 'all') return true
  return discount.applicablePlans.split(',').map((item) => item.trim()).filter(Boolean).includes(planId)
}

function getDiscountedPrice(basePrice: number, discount: DiscountRecord) {
  if (discount.type === 'percent') {
    return Math.max(0, Math.floor(basePrice * (1 - Number(discount.value || 0) / 100)))
  }
  return Math.max(0, Math.floor(basePrice - Number(discount.value || 0)))
}

export async function validateDiscount({
  code,
  user,
  planId,
  basePrice,
}: {
  code?: string | null
  user?: UserContext | null
  planId: string
  basePrice: number
}) {
  const normalizedCode = code?.trim().toUpperCase()
  const now = new Date()

  if (normalizedCode) {
    const discount = await prisma.discountCode.findUnique({
      where: { code: normalizedCode }
    }) as DiscountRecord | null

    if (!discount || !discount.isActive) {
      return { ok: false as const, error: 'Промокод не найден' }
    }

    if (discount.mode === 'compensation') {
      return { ok: false as const, error: 'Компенсация не применяется при оплате по промокоду' }
    }

    if (now < discount.validFrom || now > discount.validTo) {
      return { ok: false as const, error: 'Срок действия промокода истек' }
    }

    if (discount.usageLimit !== null && discount.usageLimit !== undefined && discount.usageCount >= discount.usageLimit) {
      return { ok: false as const, error: 'Лимит использований исчерпан' }
    }

    if (!matchesPlan(discount, planId)) {
      return { ok: false as const, error: 'Этот промокод не действует для выбранного тарифа' }
    }

    if (discount.minPurchase != null && basePrice < discount.minPurchase) {
      return { ok: false as const, error: `Минимальная сумма для акции: ${discount.minPurchase} ₽` }
    }

    if (!(await matchesAudience(discount, user))) {
      return { ok: false as const, error: 'Этот промокод недоступен для вашего аккаунта' }
    }

    return {
      ok: true as const,
      discount,
      mapped: mapDiscount(discount),
      discountedPrice: getDiscountedPrice(basePrice, discount),
    }
  }

  const candidates = await prisma.discountCode.findMany({
    where: {
      isActive: true,
      validFrom: { lte: now },
      validTo: { gte: now },
      mode: 'global',
      delivery: 'auto',
    },
    orderBy: { createdAt: 'desc' },
  }) as DiscountRecord[]

  const applicable: Array<{ discount: DiscountRecord; discountedPrice: number }> = []
  for (const discount of candidates) {
    if (!matchesPlan(discount, planId)) continue
    if (discount.minPurchase != null && basePrice < discount.minPurchase) continue
    if (discount.usageLimit !== null && discount.usageLimit !== undefined && discount.usageCount >= discount.usageLimit) continue
    if (!(await matchesAudience(discount, user))) continue
    applicable.push({
      discount,
      discountedPrice: getDiscountedPrice(basePrice, discount),
    })
  }

  if (!applicable.length) {
    return { ok: true as const, discount: null, mapped: null, discountedPrice: basePrice }
  }

  applicable.sort((a, b) => {
    const aSaving = basePrice - a.discountedPrice
    const bSaving = basePrice - b.discountedPrice
    if (bSaving !== aSaving) return bSaving - aSaving
    return new Date(b.discount.validTo).getTime() - new Date(a.discount.validTo).getTime()
  })

  return {
    ok: true as const,
    discount: applicable[0].discount,
    mapped: mapDiscount(applicable[0].discount),
    discountedPrice: applicable[0].discountedPrice,
  }
}

export async function incrementDiscountUsage(code?: string | null) {
  if (!code) return
  try {
    await prisma.discountCode.update({
      where: { code },
      data: { usageCount: { increment: 1 } }
    })
  } catch (error) {
    console.error('[discounts] failed to increment usage:', error)
  }
}

export async function broadcastDiscount(discountId: string) {
  const discount = await prisma.discountCode.findUnique({
    where: { id: discountId }
  }) as DiscountRecord | null

  if (!discount) throw new Error('Discount not found')
  if (!discount.isActive) throw new Error('Discount is not active')
  if (discount.mode === 'compensation') throw new Error('Компенсации нельзя отправлять как промокодную рассылку')
  if (discount.delivery !== 'broadcast') throw new Error('Эта акция не настроена для рассылки')

  const users = await prisma.user.findMany({
    include: { subscription: true }
  })

  const matchedUsers: Array<{ telegramId: string }> = []
  for (const user of users) {
    if (!user.telegramId) continue
    const matches = await matchesAudience(discount, {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      subscription: user.subscription
        ? {
          status: user.subscription.status,
          expiresAt: user.subscription.expiresAt,
        }
        : null,
    })
    if (matches) matchedUsers.push({ telegramId: user.telegramId })
  }

  const plansLabel = discount.applicablePlans === 'all'
    ? 'на все тарифы'
    : discount.applicablePlans
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ')

  const promoText = discount.broadcastText?.trim() || [
    `<b>${discount.mode === 'compensation' ? 'Компенсация' : 'Новая акция'} PrivatVPN</b>`,
    '',
    discount.description || (discount.mode === 'compensation'
      ? 'Мы добавили компенсационную скидку для части пользователей.'
      : 'Для вас доступна новая акция.'),
    '',
    `Промокод: <code>${discount.code}</code>`,
    `${discount.type === 'percent' ? `Скидка ${discount.value}%` : `Скидка ${discount.value} ₽`} ${plansLabel !== 'all' ? `• ${plansLabel}` : ''}`.trim(),
    `Действует до: ${discount.validTo.toLocaleDateString('ru-RU')}`,
  ].join('\n')

  let sentCount = 0
  for (const user of matchedUsers) {
    const ok = await sendTelegramMessage(user.telegramId, promoText)
    if (ok) sentCount += 1
  }

  await prisma.discountCode.update({
    where: { id: discount.id },
    data: { lastBroadcastAt: new Date() }
  })

  return { sentCount, total: matchedUsers.length }
}

export async function applyCompensation(discountId: string) {
  const discount = await prisma.discountCode.findUnique({
    where: { id: discountId }
  }) as DiscountRecord | null

  if (!discount) throw new Error('Discount not found')
  if (!discount.isActive) throw new Error('Compensation is not active')
  if (discount.mode !== 'compensation') throw new Error('Это не компенсация')

  const days = Number(discount.compensationDays ?? 0)
  if (!Number.isFinite(days) || days <= 0) throw new Error('У компенсации не указано количество дней')

  const users = await prisma.user.findMany({
    include: { subscription: true }
  })

  let appliedCount = 0
  const now = Date.now()

  for (const user of users) {
    const subscription = user.subscription
    if (!subscription) continue
    if (subscription.status !== 'active' || subscription.expiresAt.getTime() <= now) continue
    if (!matchesPlan(discount, subscription.planId)) continue

    const audienceMatches = await matchesAudience(discount, {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      subscription: {
        status: subscription.status,
        expiresAt: subscription.expiresAt,
      },
    })

    if (!audienceMatches) continue

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        expiresAt: new Date(subscription.expiresAt.getTime() + days * 24 * 60 * 60 * 1000),
      }
    })

    appliedCount += 1
  }

  const updatedDiscount = await prisma.discountCode.update({
    where: { id: discount.id },
    data: {
      usageCount: { increment: appliedCount },
      lastAppliedAt: new Date(),
    }
  }) as DiscountRecord

  return {
    appliedCount,
    days,
    discount: mapDiscount(updatedDiscount),
  }
}
