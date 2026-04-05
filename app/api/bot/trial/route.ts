import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import crypto from 'crypto'
import { sendTelegramPhoto } from '@/lib/telegram'
import path from 'path'
import { buildSubscriptionUrl, createSubscriptionToken } from '@/lib/security'
import { getClientIp } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 120, 60 * 1000, '/api/bot/trial')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
      )
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.BOT_TOKEN}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { telegramId, username, firstName, lastName, startParam } = body

    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 })
    }

    const tgId = String(telegramId)

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { telegramId: tgId },
      include: { subscription: true }
    })

    let isNewTrial = false

    let referredById: string | undefined = undefined
    if (startParam) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: startParam } })
      if (referrer) referredById = referrer.id
    }

    if (!user) {
      // Create user
      user = await prisma.user.create({
        data: {
          telegramId: tgId,
          username: username || null,
          firstName: firstName || null,
          lastName: lastName || null,
          role: 'user',
          referralCode: crypto.randomBytes(4).toString('hex'),
          referredById
        },
        include: { subscription: true }
      })

      // Create Pending Referral action upon initial creation
      if (referredById) {
        await prisma.referral.create({
          data: {
            referrerId: referredById,
            referredId: user.id,
            amount: 30, // 30 RUB baseline
            status: 'pending'
          }
        })

        // Notify Referrer
        const referrer = await prisma.user.findUnique({ where: { id: referredById } })
        if (referrer && referrer.telegramId) {
          const bannerPath = path.join(process.cwd(), 'public', 'images', 'referral-banner.png')
          const friendDisplayName = user.username ? `@${user.username}` : (user.firstName || 'Друг')
          const caption = `<b>🤝 Вместе теплее — рефералка 🧡</b>\n\nВаш друг <b>${friendDisplayName}</b> зарегистрировался по вашей ссылке.\n\nБонус 30 руб будет начислен на ваш баланс после того, как он оплатит любую подписку. ✨`
          
          await sendTelegramPhoto(referrer.telegramId, bannerPath, caption).catch(console.error)
        }
      }
    } else if (referredById && !user.referredById) {
      // Retroactive referral if the user exists but has no referrer yet
      await prisma.user.update({
        where: { id: user.id },
        data: { referredById }
      })

      await prisma.referral.create({
        data: {
          referrerId: referredById,
          referredId: user.id,
          amount: 30,
          status: 'pending'
        }
      })

      // Notify Referrer
      const referrer = await prisma.user.findUnique({ where: { id: referredById } })
      if (referrer && referrer.telegramId) {
        const bannerPath = path.join(process.cwd(), 'public', 'images', 'referral-banner.png')
        const friendDisplayName = user.username ? `@${user.username}` : (user.firstName || 'Друг')
        const caption = `<b>🤝 Вместе теплее — рефералка 🧡</b>\n\nВаш друг <b>${friendDisplayName}</b> зарегистрировался по вашей ссылке.\n\nБонус 30 руб будет начислен на ваш баланс после того, как он оплатит любую подписку. ✨`
        
        await sendTelegramPhoto(referrer.telegramId, bannerPath, caption).catch(console.error)
      }
    }

    // Give trial if no subscription exists
    if (!user.subscription) {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 1) // 1 day from now
      const vlessUuid = crypto.randomUUID()
      const linkToken = createSubscriptionToken()

      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: 'guardian', // Trial tier
          status: 'active',
          isTrial: true,
          isManual: true,
          expiresAt: expiresAt,
          vlessUuid,
          subscriptionUrl: buildSubscriptionUrl(linkToken)
        }
      })
      isNewTrial = true

      // Trigger background sync to bare-metal servers
      require('@/lib/sync').triggerSync()
    }

    return NextResponse.json({ success: true, isNewTrial })
  } catch (error) {
    console.error('Trial API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
