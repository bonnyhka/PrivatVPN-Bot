import crypto from 'crypto'
import path from 'path'
import prisma from '@/lib/db'
import { incrementDiscountUsage } from '@/lib/discounts'
import { buildSubscriptionUrl, createSubscriptionToken } from '@/lib/security'
import { isSuccessfulPaymentStatus } from '@/lib/payments'
import { sendTelegramMessage, sendTelegramPhoto } from '@/lib/telegram'

const MANUAL_PLACEHOLDER_WINDOW_MS = 24 * 60 * 60 * 1000

type FinalizePaymentOptions = {
  externalId?: string | null
  paymentStatus?: string
}

function isFreshManualPlaceholder(payment: any, subscription: any) {
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

export async function findRecentUnconfirmedPaymentForPlan(userId: string, planId: string) {
  const since = new Date(Date.now() - MANUAL_PLACEHOLDER_WINDOW_MS)

  return prisma.payment.findFirst({
    where: {
      userId,
      planId,
      amount: { gt: 0 },
      status: { in: ['pending', 'expired'] as any },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function finalizePayment(paymentId: string, options: FinalizePaymentOptions = {}) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: { include: { subscription: true } } },
  })

  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`)
  }

  if (isSuccessfulPaymentStatus(payment.status)) {
    return { alreadyProcessed: true, payment }
  }

  const nextStatus = options.paymentStatus || 'success'

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: nextStatus,
      externalId: options.externalId ?? payment.externalId ?? null,
      updatedAt: new Date(),
    },
  })

  if (payment.promoCode) {
    await incrementDiscountUsage(payment.promoCode)
  }

  const user = payment.user

  if (payment.isGift) {
    let toId = null
    if (payment.receiverUsername) {
      const normalizedUsername = payment.receiverUsername.toLowerCase()
      const recipient = await prisma.user.findFirst({
        where: { username: normalizedUsername },
      })
      if (recipient) {
        toId = recipient.id
      }
    }

    const giftCode = `PVPN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    await (prisma.gift as any).create({
      data: {
        code: giftCode,
        planId: payment.planId,
        months: payment.months || 1,
        fromId: user.id,
        toId,
        toUsername: payment.receiverUsername || null,
        isPreOrder: payment.isPreOrder,
      },
    })

    let botMessage = `<b>🎁 Ваш подарок готов!</b>\n\nВы успешно приобрели подписку в подарок.`
    if (payment.isPreOrder) {
      botMessage = `<b>📅 Предзаказ подарка оформлен!</b>\n\nВы забронировали подписку для друга. Она активируется автоматически после окончания его текущего тарифа.`
    }
    if (payment.receiverUsername) {
      botMessage += `\n\nПолучатель: <b>@${payment.receiverUsername}</b>`
      if (toId) {
        botMessage += `\n<i>Пользователь найден, подарок будет активирован при его входе в приложение.</i>`
      } else {
        botMessage += `\n<i>Пользователь пока не зарегистрирован в боте. Перешлите ему код активации ниже:</i>`
      }
    }

    botMessage += `\n\nКод активации:\n<code>${giftCode}</code>\n\n<i>Код активации действителен бессрочно.</i>`

    await sendTelegramMessage(user.telegramId, botMessage)
    return { alreadyProcessed: false, paymentId: payment.id, giftCode }
  }

  const currentSubscription = user.subscription
  const keepManualPlaceholder = isFreshManualPlaceholder(payment, currentSubscription)
  const vlessUuid = currentSubscription?.vlessUuid || crypto.randomUUID()
  const currentUrl = currentSubscription?.subscriptionUrl || null
  const nextSubscriptionUrl = currentUrl || buildSubscriptionUrl(createSubscriptionToken())

  let expiresAt = new Date()
  const monthsMultiplier = payment.months || 1
  const additionalMs = monthsMultiplier * 30 * 24 * 60 * 60 * 1000

  if (keepManualPlaceholder && currentSubscription) {
    // Admin may have temporarily issued the same plan while payment confirmation lagged.
    expiresAt = currentSubscription.expiresAt
  } else if (currentSubscription && currentSubscription.planId === payment.planId && currentSubscription.status === 'active') {
    const baseTime = Math.max(Date.now(), currentSubscription.expiresAt.getTime())
    expiresAt = new Date(baseTime + additionalMs)
  } else {
    expiresAt = new Date(Date.now() + additionalMs)
  }

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      planId: payment.planId,
      status: 'active',
      expiresAt,
      vlessUuid,
      subscriptionUrl: nextSubscriptionUrl,
      trafficUsed: keepManualPlaceholder && currentSubscription ? currentSubscription.trafficUsed : 0,
      isManual: false,
      lastTrafficReset: keepManualPlaceholder && currentSubscription ? currentSubscription.lastTrafficReset : new Date(),
      updatedAt: new Date(),
    },
    create: {
      userId: user.id,
      planId: payment.planId,
      status: 'active',
      expiresAt,
      vlessUuid,
      trafficUsed: 0,
      lastTrafficReset: new Date(),
      subscriptionUrl: nextSubscriptionUrl,
      isManual: false,
    },
  })

  if (user.referredById) {
    const existingReferral = await prisma.referral.findFirst({
      where: { referredId: user.id },
    })

    if (!existingReferral) {
      const rewardAmount = 30
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.referredById },
          data: { balance: { increment: rewardAmount } },
        }),
        prisma.referral.create({
          data: {
            referrerId: user.referredById,
            referredId: user.id,
            amount: rewardAmount,
            status: 'credited',
          },
        }),
      ])
    } else if (existingReferral.status === 'pending') {
      const rewardAmount = existingReferral.amount
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.referredById },
          data: { balance: { increment: rewardAmount } },
        }),
        prisma.referral.update({
          where: { id: existingReferral.id },
          data: { status: 'credited' },
        }),
      ])

      const referrer = await prisma.user.findUnique({ where: { id: user.referredById } })
      if (referrer?.telegramId) {
        const bannerPath = path.join(process.cwd(), 'public', 'images', 'referral-banner.png')
        const friendDisplayName = user.username ? `@${user.username}` : (user.firstName || 'Друг')
        const caption = `<b>💖 Вместе теплее!</b>\n\nВаш друг <b>${friendDisplayName}</b> подключил PrivatVPN по вашей ссылке. +${rewardAmount} руб на баланс!\n\n<i>Приглашайте друзей — получайте бонусы за каждого!</i>`

        await sendTelegramPhoto(referrer.telegramId, bannerPath, caption, {
          inline_keyboard: [[{ text: '👥 Пригласить еще', web_app: { url: process.env.WEB_APP_URL || 'https://privatevp.space/' } }]],
        }).catch(console.error)
      }
    }
  }

  require('@/lib/sync').triggerSync()

  return { alreadyProcessed: false, paymentId: payment.id }
}

