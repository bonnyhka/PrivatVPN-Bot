import prisma from '@/lib/db'
import { exec } from 'child_process'
import path from 'path'
const BOT_TOKEN = process.env.BOT_TOKEN
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://privatevp.space'

if (!BOT_TOKEN) {
  console.error('[NOTIFY-EXPIRED] Fatal: BOT_TOKEN is missing from environment variables.')
  process.exit(1)
}

// 60 minutes = 1 hour
const CYCLE_MS = 60 * 60 * 1000

async function sendExpirationMessage(telegramId: string) {
  const text = 
    `❌ <b>У вас закончился доступ к PrivatVPN</b> ☹️\n\n` +
    `✅ Чтобы восстановить доступ к YouTube, Instagram, Discord и другим удобным сервисам — жмите на кнопку <b>Продлить</b>.\n\n` +
    `👉 <i>1 ключ на любые 3 устройства с премиум-скоростью</i> 🔥`

  const layout = [
    [
      { text: '💳 Продлить', web_app: { url: WEB_APP_URL } }
    ],
    [
      { text: 'ℹ️ Служба поддержки', web_app: { url: `${WEB_APP_URL}/support` } }
    ]
  ]

  const fs = require('fs')
  const bannerPath = '/root/PrivatVPN-Bot-Redesign/public/images/no-subscription.png'

  try {
    const form = new FormData()
    form.append('chat_id', telegramId)
    
    const fileBuffer = fs.readFileSync(bannerPath)
    const blob = new Blob([fileBuffer], { type: 'image/png' })
    form.append('photo', blob, 'banner.png')
    
    form.append('caption', text)
    form.append('parse_mode', 'HTML')
    form.append('reply_markup', JSON.stringify({
      inline_keyboard: layout
    }))

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form as any
    })

    if (!res.ok) {
      console.error(`[NOTIFY-EXPIRED] Telegram API failed for ${telegramId}: ${res.statusText}`)
    }
  } catch (error) {
    console.error(`[NOTIFY-EXPIRED] Network error sending to ${telegramId}:`, error)
  }
}

async function runCycle() {
  try {
    console.log(`[NOTIFY-EXPIRED] Starting scan cycle at ${new Date().toISOString()}`)
    
    // Find subscriptions that have passed their expiration date but are still marked active
    const expiredSubUsers = await prisma.subscription.findMany({
      where: {
        expiresAt: { lt: new Date() },
        status: 'active'
      },
      include: {
        user: { select: { telegramId: true } }
      }
    })

    if (expiredSubUsers.length === 0) {
      console.log('[NOTIFY-EXPIRED] Scan complete. No new expirations found.')
      return
    }

    console.log(`[NOTIFY-EXPIRED] Found ${expiredSubUsers.length} active subscriptions that have expired. Processing...`)

    let processedCount = 0

    for (const sub of expiredSubUsers) {
      const tgId = sub.user.telegramId
      if (!tgId) continue

      // 1. Send the broadcast Telegram notification
      await sendExpirationMessage(tgId)

      // 2. Set DB Status to expired so it won't be triggered again
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'expired' }
      })

      console.log(`[NOTIFY-EXPIRED] Revoked and notified user: ${tgId}`)
      processedCount++
    }

    // 3. Trigger a system-wide node configuration sync to sever connections immediately
    if (processedCount > 0) {
      const scriptPath = path.join(__dirname, 'sync-vpn-singbox.ts')
      console.log(`[NOTIFY-EXPIRED] Triggering sync script: npx tsx ${scriptPath}`)
      
      exec(`npx tsx ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`[NOTIFY-EXPIRED] Sync trigger failed: ${error.message}`)
          return
        }
        console.log(`[NOTIFY-EXPIRED] Sync completed successfully. Nodes are updated.`)
      })
    }

  } catch (err) {
    console.error(`[NOTIFY-EXPIRED] Cycle error:`, err)
  }
}

// Continuous loop for background execution
async function main() {
  console.log('[NOTIFY-EXPIRED] Process initialized via PM2. Commencing background monitoring loops.')
  // Run instantly on start
  await runCycle()
  
  // Schedule subsequent runs
  setInterval(runCycle, CYCLE_MS)
}

main()
