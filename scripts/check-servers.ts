import prisma from '@/lib/db'
import net from 'net'

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || ''

async function scheduleTelegramDelete(chatId: string, messageId: number, delayMs = 5 * 60 * 1000) {
  const deleteAt = new Date(Date.now() + delayMs)
  await prisma.pendingMessageDelete.create({
    data: { chatId, messageId, deleteAt }
  }).catch(() => {})
}

async function sendTelegramMessage(telegramId: string, text: string, extra: object = {}) {
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
      if (msgId) {
        await scheduleTelegramDelete(telegramId, msgId)
      }
    }

    return res.ok
  } catch {
    return false
  }
}

async function checkPort(host: string, port: number, timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const id = setTimeout(() => { socket.destroy(); resolve(false) }, timeout)
    socket.connect(port, host, () => { clearTimeout(id); socket.destroy(); resolve(true) })
    socket.on('error', () => { clearTimeout(id); socket.destroy(); resolve(false) })
  })
}

async function main() {
  while (true) {
    try {
      console.log(`[${new Date().toISOString()}] Running server health check...`)

      const locations = await prisma.location.findMany({ where: { isActive: true } })

      for (const loc of locations) {
        const host = loc.host
        
        const [vlessUp, ssUp] = await Promise.all([
          checkPort(host, 12443),
          checkPort(host, 15113),
        ])

        const isUp = vlessUp || ssUp

        if (!isUp) {
          console.warn(`[DOWN] ${loc.name} (${host}) is NOT responding!`)

          if (ADMIN_TELEGRAM_ID) {
            await sendTelegramMessage(
              ADMIN_TELEGRAM_ID,
              `🚨 <b>Сервер недоступен!</b>\n\n<b>${loc.name}</b> (${host}) не отвечает ни на VLESS (12443) ни на SS (15113).\n\n⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
            )
          }
        } else {
          console.log(`[OK] ${loc.name} — VLESS:${vlessUp ? '✓' : '✗'} SS:${ssUp ? '✓' : '✗'}`)
        }
      }

      console.log(`[${new Date().toISOString()}] Health check complete.`)
    } catch (err) {
      console.error('Error in check-servers loop:', err)
    }

    // Wait for 10 minutes
    await new Promise(r => setTimeout(r, 600000))
  }
}

process.on('SIGINT', async () => { await prisma.$disconnect(); process.exit(0) })
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0) })

main().catch(console.error)
