import prisma from '@/lib/db'
const {
  probeVless,
  findSampleUsersByPlan,
  getPlanVlessPort,
} = require('../lib/proxy-smoke') as typeof import('../lib/proxy-smoke')

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || ''

// Track consecutive failures per (location, protocol) to avoid spam
const failureCount: Record<string, number> = {}
const ALERT_AFTER_FAILURES = 2  // alert after 2 consecutive failures (~20 min)
const RECOVERY_ALERT = true     // also alert when protocol recovers

async function scheduleTelegramDelete(chatId: string, messageId: number, delayMs = 10 * 60 * 1000) {
  const deleteAt = new Date(Date.now() + delayMs)
  await prisma.pendingMessageDelete.create({
    data: { chatId, messageId, deleteAt }
  }).catch(() => {})
}

async function sendTelegramMessage(telegramId: string, text: string, extra: object = {}, delayMs = 10 * 60 * 1000) {
  const token = process.env.BOT_TOKEN
  if (!token) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramId, text, parse_mode: 'HTML', ...extra }),
    })

    if (res.ok) {
      const data = await res.json()
      const msgId = data.result?.message_id
      if (msgId) await scheduleTelegramDelete(telegramId, msgId, delayMs)
    }

    return res.ok
  } catch {
    return false
  }
}

async function sendTelegramPhotoWithDelay(telegramId: string, photoPath: string, caption: string, delayMs: number) {
  const token = process.env.BOT_TOKEN
  if (!token) return false
  try {
    const fs = await import('fs')
    const formData = new FormData()
    formData.append('chat_id', telegramId)
    formData.append('photo', new Blob([fs.readFileSync(photoPath)], { type: 'image/png' }), 'banner.png')
    formData.append('caption', caption)
    formData.append('parse_mode', 'HTML')

    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: formData
    })
    if (res.ok) {
      const data = await res.json()
      const msgId = data.result?.message_id
      if (msgId) await scheduleTelegramDelete(telegramId, msgId, delayMs)
    }
  } catch (err) {
    console.error('Photo error', err)
  }
}

function failureKey(locId: string, proto: string) {
  return `${locId}:${proto}`
}

async function handleProbeResult(
  locId: string,
  locName: string,
  proto: string,
  probeResult: { ok: boolean; latency?: number; error?: string | null },
  emoji: string,
) {
  const key = failureKey(locId, proto)
  const prevCount = failureCount[key] ?? 0

  if (!probeResult.ok) {
    failureCount[key] = prevCount + 1
    const count = failureCount[key]

    console.warn(
      `[WARN] ${locName} — ${proto} FAIL (x${count}): ${probeResult.error || 'no response'}`
    )

    // Alert after N consecutive failures
    if (count === ALERT_AFTER_FAILURES && ADMIN_TELEGRAM_ID) {
      await sendTelegramMessage(
        ADMIN_TELEGRAM_ID,
        `${emoji} <b>${proto} недоступен: ${locName}</b>\n\n` +
        `Протокол не отвечает уже ${count} проверки подряд (~${count * 10} мин).\n` +
        `Ошибка: <code>${probeResult.error || 'нет ответа'}</code>\n\n` +
        `⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
        {},
        20 * 60 * 1000 // 20 min delete for admins
      )
    }
  } else {
    const wasDown = prevCount >= ALERT_AFTER_FAILURES

    if (wasDown && RECOVERY_ALERT && ADMIN_TELEGRAM_ID) {
      await sendTelegramMessage(
        ADMIN_TELEGRAM_ID,
        `✅ <b>${proto} восстановлен: ${locName}</b>\n\n` +
        `Протокол снова отвечает. Задержка: ${probeResult.latency ?? '?'}ms\n\n` +
        `⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
      )
    }

    failureCount[key] = 0
    console.log(`[OK] ${locName} — ${proto}: ✓ ${probeResult.latency ?? '?'}ms`)
  }
}


async function main() {
  console.log(`[${new Date().toISOString()}] Protocol-level health checker started`)
  console.log('Checking: VLESS+REALITY (sing-box smoke)')

  if (process.argv.includes("--once")) { await runCheckCycle(); return; } while (true) {
    try {
      console.log(`\n[${new Date().toISOString()}] === Health check cycle ===`)

      const sampleUsersByPlan = await findSampleUsersByPlan(prisma)
      const locations = await prisma.location.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          host: true,
          vlessPort: true,
          vlessUuid: true,
          vlessRealityPublicKey: true,
          vlessRealityShortId: true,
          vlessRealitySni: true,
        },
      })

      for (const loc of locations) {
        const vPort = loc.vlessPort || getPlanVlessPort('citadel')

        const vlessResult = await probeVless(loc, sampleUsersByPlan.citadel, vPort)

        await handleProbeResult(loc.id, loc.name, 'VLESS+REALITY', vlessResult, '🔴')

        // Full server down
        if (!vlessResult.ok) {
          const key = failureKey(loc.id, 'ALL')
          const count = (failureCount[key] ?? 0) + 1
          failureCount[key] = count

          console.error(`[DOWN] ${loc.name} (${loc.host}) — ALL protocols failed!`)

          if (count === 1 && ADMIN_TELEGRAM_ID) {
            await sendTelegramMessage(
              ADMIN_TELEGRAM_ID,
              `🚨 <b>Сервер недоступен!</b>\n\n` +
              `<b>${loc.name}</b> (${loc.host})\n` +
              `VLESS: ❌ ${vlessResult.error || 'fail'}\n\n` +
              `⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
              {},
              20 * 60 * 1000 // 20 min for admins
            )
          }

          // Broadcast to active users after 2 failures (to prevent false positives on random ping blips)
          if (count === 2) {
            console.log(`[BROADCAST] Sending 'down' notification to all active users for ${loc.name}`)
            const path = await import('path')
            const photoPath = path.join(process.cwd(), 'bot', 'incident-banner.png')
            const caption = `⚠️ **Зафиксированы сбои на сервере ${loc.name}**\n\nВозможно, провайдер временно ограничивает этот маршрут. Мы уже работаем над решением проблемы.\n\n🔄 **Что делать?**\nВ приложении PrivatVPN выберите другой сервер — остальные локации продолжают работать стабильно.`
            
            const activeUsers = await prisma.user.findMany({
               where: { subscription: { status: 'active', expiresAt: { gt: new Date() } } }
            })
            
            let sent = 0
            for (const user of activeUsers) {
               await sendTelegramPhotoWithDelay(user.telegramId, photoPath, caption, 5 * 60 * 1000) // 5 min for users
               sent++
               await new Promise(r => setTimeout(r, 50)) // rate limit protection
            }
            console.log(`[BROADCAST] Finished sending ${sent} messages for ${loc.name} outage.`)
          }
        } else {
          failureCount[failureKey(loc.id, 'ALL')] = 0
        }
      }

      console.log(`[${new Date().toISOString()}] Health check cycle complete`)
    } catch (err) {
      console.error('Error in check-servers loop:', err)
    }

    // Every 10 minutes
    if (process.argv.includes("--once")) return; await new Promise(r => setTimeout(r, 600_000))
  }
}

process.on('SIGINT', async () => { await prisma.$disconnect(); process.exit(0) })
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0) })

main().catch(console.error)
