import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import crypto from 'crypto'
import { sendTelegramPhoto } from '@/lib/telegram'
import path from 'path'
import { incrementDiscountUsage } from '@/lib/discounts'
import { buildSubscriptionUrl, createSubscriptionToken } from '@/lib/security'

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

    if (payment.status === 'success') {
      return new Response('Already processed', { status: 200 })
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'success',
        externalId: operation_id,
        updatedAt: new Date()
      }
    })

    if (payment.promoCode) {
      await incrementDiscountUsage(payment.promoCode)
    }

    // Activate subscription or Create Gift
    const user = payment.user

    if (payment.isGift) {
      // Resolve recipient if username provided
      let toId = null
      if (payment.receiverUsername) {
        const normalizedUsername = payment.receiverUsername.toLowerCase()
        const recipient = await prisma.user.findFirst({
          where: { username: normalizedUsername }
        })
        if (recipient) {
          toId = recipient.id
        }
      }

      // Create Gift record
      const giftCode = `PVPN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
      await (prisma.gift as any).create({
        data: {
          code: giftCode,
          planId: payment.planId,
          months: payment.months || 1,
          fromId: user.id,
          toId: toId,
          toUsername: payment.receiverUsername || null,
          isPreOrder: payment.isPreOrder
        }
      })

      // Notify Buyer with the code or confirmation
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
      
      const { sendTelegramMessage } = require('@/lib/telegram')
      await sendTelegramMessage(user.telegramId, botMessage)
      
      return new Response('OK', { status: 200 })
    }

    const vlessUuid = user.subscription?.vlessUuid || crypto.randomUUID()
    const linkToken = createSubscriptionToken()
    
    let expiresAt = new Date()
    const monthsMultiplier = payment.months || 1
    const additionalMs = monthsMultiplier * 30 * 24 * 60 * 60 * 1000

    if (user.subscription && user.subscription.planId === payment.planId && user.subscription.status === 'active') {
      // Extending the SAME active plan: add time to the existing expiration
      const baseTime = Math.max(Date.now(), user.subscription.expiresAt.getTime())
      expiresAt = new Date(baseTime + additionalMs)
    } else {
      // Buying a DIFFERENT plan (upgrading/downgrading): reset expiration
      expiresAt = new Date(Date.now() + additionalMs)
    }

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        planId: payment.planId,
        status: 'active',
        expiresAt,
        vlessUuid,
        subscriptionUrl: buildSubscriptionUrl(linkToken),
        trafficUsed: 0,
        isManual: false,
        lastTrafficReset: new Date(),
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        planId: payment.planId,
        status: 'active',
        expiresAt,
        vlessUuid,
        trafficUsed: 0,
        lastTrafficReset: new Date(),
        subscriptionUrl: buildSubscriptionUrl(linkToken),
        isManual: false,
      }
    })

    // Handle referral reward if first purchase
    if (user.referredById) {
      const existingReferral = await prisma.referral.findFirst({
        where: { referredId: user.id }
      })

      if (!existingReferral) {
        const rewardAmount = 30
        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.referredById },
            data: { balance: { increment: rewardAmount } }
          }),
          prisma.referral.create({
            data: {
              referrerId: user.referredById,
              referredId: user.id,
              amount: rewardAmount,
              status: 'credited'
            }
          })
        ])
      } else if (existingReferral.status === 'pending') {
        const rewardAmount = existingReferral.amount
        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.referredById },
            data: { balance: { increment: rewardAmount } }
          }),
          prisma.referral.update({
            where: { id: existingReferral.id },
            data: { status: 'credited' }
          })
        ])

        // Notify Referrer
        const referrer = await prisma.user.findUnique({ where: { id: user.referredById } })
        if (referrer && referrer.telegramId) {
          const bannerPath = path.join(process.cwd(), 'public', 'images', 'referral-banner.png')
          const friendDisplayName = user.username ? `@${user.username}` : (user.firstName || 'Друг')
          const caption = `<b>💖 Вместе теплее!</b>\n\nВаш друг <b>${friendDisplayName}</b> подключил PrivatVPN по вашей ссылке. +${rewardAmount} руб на баланс!\n\n<i>Приглашайте друзей — получайте бонусы за каждого!</i>`
          
          await sendTelegramPhoto(referrer.telegramId, bannerPath, caption, {
            inline_keyboard: [[{ text: '👥 Пригласить еще', web_app: { url: process.env.WEB_APP_URL || 'https://privatevp.space/' } }]]
          }).catch(console.error)
        }
      }
    }
    
    // Trigger sync to bare-metal servers
    require('@/lib/sync').triggerSync()

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('YooMoney Notification Error:', error)
    return new Response('Internal Error', { status: 500 })
  }
}
