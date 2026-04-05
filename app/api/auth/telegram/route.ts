console.log('TELEGRAM_AUTH_ROUTE_LOADED')
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-security'
import { sendTelegramPhoto } from '@/lib/telegram'
import { formatUserForClient } from '@/lib/format-user'
import path from 'path'

export async function POST(req: Request) {
  console.log('TELEGRAM_AUTH_HIT')
  try {
    // Rate limit: max 10 auth requests per minute per IP
    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 10, 60 * 1000, '/api/auth/telegram')
    if (!allowed) {
      return NextResponse.json({ error: 'Too Many Requests' }, {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) }
      })
    }

    const { initData } = await req.json()

    if (!initData) {
      return NextResponse.json({ error: 'No initData provided' }, { status: 400 })
    }

    // Parse initData
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')
    urlParams.delete('hash')
    
    // Sort keys alphabetically
    const keys = Array.from(urlParams.keys()).sort()
    const dataCheckString = keys.map(key => `${key}=${urlParams.get(key)}`).join('\n')
    
    const botToken = process.env.BOT_TOKEN
    
    if (!botToken) {
      console.error("BOT_TOKEN is not defined in the environment.")
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

    if (calculatedHash !== hash) {
      return NextResponse.json({ error: 'Invalid hash' }, { status: 401 })
    }

    const userStr = urlParams.get('user')
    if (!userStr) {
      return NextResponse.json({ error: 'No user data' }, { status: 400 })
    }

    const tgUser = JSON.parse(userStr)
    const tgId = String(tgUser.id)
    const startParam = urlParams.get('start_param')
    const avatarUrl: string | null = tgUser.photo_url || null

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { telegramId: tgId }, select: { id: true, role: true, referralCode: true } })
    const isFirstUser = !existingUser && (await prisma.user.count()) === 0

    let referredById: string | null = null
    if (!existingUser && startParam) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: startParam } })
      if (referrer) referredById = referrer.id
    }

    // Upsert user in the database
    const user = await prisma.user.upsert({
      where: { telegramId: tgId },
      update: {
        username: tgUser.username,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        ...(avatarUrl && { avatar: avatarUrl }),
        // Grant owner role if it's the specified ID
        ...(tgId === '5005525666' && { role: 'owner' }),
        // Protect admin role for privatvpnadmin
        ...(tgId === '7923347249' && { role: 'admin' }),
        // Ensure referralCode exists
        referralCode: (existingUser as any)?.referralCode || crypto.randomBytes(4).toString('hex')
      },
      create: {
        telegramId: tgId,
        username: tgUser.username,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        avatar: avatarUrl || undefined,
        role: (tgId === '5005525666' || isFirstUser) ? 'owner' : 'user',
        referredById,
        referralCode: crypto.randomBytes(4).toString('hex') // Generate short friendly code
      },
        include: { 
          subscription: true,
          referralActions: {
            include: { referred: { select: { username: true, avatar: true, firstName: true } } },
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          _count: { select: { referrals: true } }
        }
    }) as any

    // Create pending referral action if this was a brand new registration locally
    if (!existingUser && referredById) {
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

    // Create session cookie for security
    const { createSession } = await import('@/lib/auth')
    await createSession(user.id)

    const formattedUser = formatUserForClient(user)

    console.log(`Auth successful for ${tgId}. Role: ${formattedUser.role}, Ref: ${formattedUser.referralCode}`)
    return NextResponse.json({ user: formattedUser })

  } catch (error) {
    console.error('Telegram Auth Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
