import prisma from '@/lib/db'
import { PLANS } from '@/lib/store'

async function scheduleTelegramDelete(chatId: string, messageId: number, delayMs = 5 * 60 * 1000) {
  const deleteAt = new Date(Date.now() + delayMs)
  await prisma.pendingMessageDelete.create({
    data: { chatId, messageId, deleteAt }
  }).catch(() => {})
}

async function sendTelegramPhoto(telegramId: string, photoPath: string, caption: string) {
  const token = process.env.BOT_TOKEN
  if (!token) return false
  
  const fs = require('fs')
  
  try {
    const form = new FormData()
    form.append('chat_id', telegramId)
    
    const fileBuffer = fs.readFileSync(photoPath)
    const blob = new Blob([fileBuffer], { type: 'image/png' })
    form.append('photo', blob, 'banner.png')
    
    form.append('caption', caption)
    form.append('parse_mode', 'HTML')
    form.append('reply_markup', JSON.stringify({
      inline_keyboard: [[{ text: '💳 Продлить тариф', web_app: { url: process.env.WEB_APP_URL || 'https://privatevp.space/' } }]]
    }))

    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form as any
    })
    
    if (res.ok) {
      const data = await res.json()
      const msgId = data.result?.message_id
      if (msgId) {
        await scheduleTelegramDelete(telegramId, msgId)
      }
    }
    
    return res.ok
  } catch (err) {
    console.error(`Failed to send photo to ${telegramId}:`, err)
    return false
  }
}

async function sendTelegramMessage(telegramId: string, text: string) {
  const token = process.env.BOT_TOKEN
  if (!token) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '💳 Продлить тариф', web_app: { url: process.env.WEB_APP_URL || 'https://privatevp.space/' } }]]
        }
      })
    })

    if (res.ok) {
      const data = await res.json()
      const msgId = data.result?.message_id
      if (msgId) {
        await scheduleTelegramDelete(telegramId, msgId)
      }
    }

    return res.ok
  } catch (err) {
    console.error(`Failed to send message to ${telegramId}:`, err)
    return false
  }
}

async function processPendingDeletes() {
  const token = process.env.BOT_TOKEN
  if (!token) return
  
  const now = new Date()
  const pending = await prisma.pendingMessageDelete.findMany({
    where: { deleteAt: { lte: now } }
  })
  
  if (pending.length === 0) return
  
  console.log(`Processing ${pending.length} pending message deletions...`)
  
  for (const item of pending) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/deleteMessage?chat_id=${item.chatId}&message_id=${item.messageId}`)
    } catch (err) {
      console.error(`Failed to delete message ${item.messageId} in chat ${item.chatId}:`, err)
    }
  }
  
  await prisma.pendingMessageDelete.deleteMany({
    where: { id: { in: pending.map(p => p.id) } }
  })
}

async function main() {
  while (true) {
    try {
      console.log(`[${new Date().toISOString()}] Checking subscriptions and cleanups...`)
      
      // First, process deletions
      await processPendingDeletes()

      const mskOffset = 3 * 60 * 60 * 1000
      const now = new Date(Date.now() + mskOffset)
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      const parseExpiry = (val: any) => {
        if (val instanceof Date) return val
        if (typeof val === 'number') return new Date(val)
        if (typeof val === 'bigint') return new Date(Number(val))
        if (typeof val === 'string' && !isNaN(Number(val))) return new Date(Number(val))
        return new Date(val)
      }

      // 1. Handle NEWLY expired subscriptions
      const activeSubs = await prisma.subscription.findMany({
        where: { status: 'active' },
        include: { user: true }
      })

      const expiredSubs = activeSubs.filter(sub => {
        const expiry = parseExpiry(sub.expiresAt)
        const plan = PLANS.find(p => p.id === sub.planId)
        const isTimeExpired = expiry < now
        const isTrafficExhausted = plan && plan.trafficLimit !== Number.MAX_SAFE_INTEGER && Number(sub.trafficUsed) >= plan.trafficLimit
        
        if (isTimeExpired || isTrafficExhausted) {
          (sub as any).expiredReason = isTimeExpired ? 'time' : 'traffic'
          return true
        }
        return false
      })

      for (const sub of expiredSubs) {
        console.log(`Marking expired: sub ${sub.id} (User: ${sub.user.telegramId})`)
        await prisma.subscription.update({ 
          where: { id: sub.id }, 
          data: { 
            status: 'expired',
            lastExpiredReminderAt: now 
          } as any
        })

        if (sub.user.telegramId) {
          // Check for Pre-orders
          const preOrderGift = await (prisma.gift as any).findFirst({
            where: { toId: sub.userId, isUsed: false, isPreOrder: true }
          })

          if (preOrderGift) {
            console.log(`Auto-activating pre-order gift ${preOrderGift.id} for user ${sub.userId}`)
            const additionalMs = preOrderGift.months * 30 * 24 * 60 * 60 * 1000
            const newExpiry = new Date(Date.now() + additionalMs)
            const vlessUuid = sub.vlessUuid || require('crypto').randomUUID()

            await prisma.$transaction([
              prisma.subscription.update({
                where: { id: sub.id },
                data: {
                  planId: preOrderGift.planId,
                  status: 'active',
                  expiresAt: newExpiry,
                  vlessUuid,
                  updatedAt: new Date()
                }
              }),
              (prisma.gift as any).update({
                where: { id: preOrderGift.id },
                data: { isUsed: true, usedAt: new Date() }
              })
            ])

            await sendTelegramMessage(sub.user.telegramId,
              `<b>🎁 Ваш предзаказанный подарок активирован!</b>\n\nВаша подписка была автоматически продлена по тарифу <b>${preOrderGift.planId.toUpperCase()}</b>.\n\n<i>Приятного пользования! 🛡️⚡</i>`
            )
          } else {
            const bannerPath = '/root/PrivatVPN-Bot-Redesign/public/images/no-subscription.png'
            const reason = (sub as any).expiredReason === 'traffic'
              ? `<b>⚠️ Вы исчерпали лимит трафика!</b>\n\nЕжемесячный трафик по вашему тарифу закончился, и доступ к приватному интернету был приостановлен. 😔\n\n🛡️ <b>Что делать дальше:</b>\nНажмите кнопку ниже, чтобы продлить подписку или перейти на безлимитный тариф!`
              : `<b>⚠️ Доступ к VPN приостановлен!</b>\n\nВаша подписка на <b>PrivatVPN</b> подошла к концу, и ваш ключ был деактивирован. 😔\n\n🛡️ <b>Чтобы снова пользоваться приватным интернетом:</b>\nНажмите кнопку ниже, выберите подходящий тариф и оплатите подписку.\n\n<i>Тарифы стартуют всего от 50 руб/мес!</i>`
            await sendTelegramPhoto(sub.user.telegramId, bannerPath, reason)
          }
        }
      }

      // 2. HOURLY "Spam" for already expired subscriptions
      const persistentExpired = await prisma.subscription.findMany({
        where: { 
          status: 'expired', 
          OR: [
            { lastExpiredReminderAt: { lt: oneHourAgo } } as any,
            { lastExpiredReminderAt: null } as any
          ]
        },
        include: { user: true }
      })

      for (const sub of persistentExpired) {
        console.log(`Sending hourly reminder: sub ${sub.id} (User: ${sub.user.telegramId})`)
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { lastExpiredReminderAt: now } as any
        })

        if (sub.user.telegramId) {
          const bannerPath = '/root/PrivatVPN-Bot-Redesign/public/images/no-subscription.png'
          await sendTelegramPhoto(sub.user.telegramId, bannerPath,
            `<b>💨 Напоминаем: Ваш VPN отключен!</b>\n\nВы потеряли доступ к защищенному интернету. Продлите подписку за пару кликов, чтобы вернуть доступ.\n\n<i>Без паники — ваши настройки сохранены, достаточно просто оплатить!</i>`
          )
        }
      }

      if (expiredSubs.length > 0) {
        console.log(`State change: Expired ${expiredSubs.length}. Triggering server sync...`)
        try {
          const { execSync } = require('child_process')
          execSync('npx tsx scripts/sync-vpn-singbox.ts', { stdio: 'inherit' })
        } catch (err) {
          console.error('Failed to trigger sync:', err)
        }
      }

      // 3. Send 3-day expiry warnings
      const expiringSoon = await prisma.subscription.findMany({
        where: {
          status: 'active',
          expiresAt: { gt: now, lte: in3Days },
          isManual: false,
        },
        include: { user: true }
      })

      for (const sub of expiringSoon) {
        const daysLeft = Math.ceil((sub.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        console.log(`Warning: sub ${sub.id} expires in ~${daysLeft}d (User: ${sub.user.telegramId})`)

        if (sub.user.telegramId) {
          // Check if we already sent a warning recently (avoid spamming if script runs multiple times)
          // We can use a simplified check or just rely on the 10-minute loop.
          const expireDate = sub.expiresAt.toLocaleDateString('ru-RU')
          await sendTelegramMessage(sub.user.telegramId,
            `<b>⏰ Ваша подписка истекает через ${daysLeft} ${daysLeft === 1 ? 'день' : 'дня'}!</b>\n\nДата окончания: <b>${expireDate}</b>\n\nЧтобы не потерять доступ к VPN, продлите подписку заранее.`
          )
        }
      }

      console.log(`[${new Date().toISOString()}] Check complete. Expired: ${expiredSubs.length}, Reminded: ${persistentExpired.length}, Warning: ${expiringSoon.length}`)
    } catch (err) {
      console.error('Error in check-expirations loop:', err)
    }
    
    // Wait for 1 minute (more frequent cycles to handle deletions better)
    await new Promise(r => setTimeout(r, 60000))
  }
}

main()
  .catch(console.error)
  .finally(async () => { await prisma.$disconnect() })
