import fs from 'fs'
import prisma from '@/lib/db'

async function scheduleTelegramDelete(chatId: string, messageId: number, delayMs = 5 * 60 * 1000) {
  const deleteAt = new Date(Date.now() + delayMs)
  await prisma.pendingMessageDelete.create({
    data: { chatId, messageId, deleteAt }
  }).catch(() => {}) // non-critical, never throw
}

export async function sendTelegramPhoto(telegramId: string, photoPath: string, caption: string, replyMarkup?: any) {
  const token = process.env.BOT_TOKEN
  if (!token) {
    console.error('[TELEGRAM] BOT_TOKEN missing')
    return false
  }

  try {
    const formData = new FormData()
    formData.append('chat_id', telegramId)
    
    const fileBuffer = fs.readFileSync(photoPath)
    const blob = new Blob([fileBuffer], { type: 'image/png' })
    formData.append('photo', blob, 'banner.png')
    
    formData.append('caption', caption)
    formData.append('parse_mode', 'HTML')
    if (replyMarkup) {
      formData.append('reply_markup', JSON.stringify(replyMarkup))
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: formData
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[TELEGRAM] sendPhoto failed: ${res.status} ${errText}`)
      return false
    }

    const data = await res.json()
    const msgId = data.result?.message_id
    if (msgId) {
      await scheduleTelegramDelete(telegramId, msgId)
    }

    return true
  } catch (error) {
    console.error('[TELEGRAM] sendPhoto error:', error)
    return false
  }
}

export async function sendTelegramMessage(telegramId: string, text: string, replyMarkup?: any) {
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
        reply_markup: replyMarkup
      })
    })

    if (!res.ok) return false

    const data = await res.json()
    const msgId = data.result?.message_id
    if (msgId) {
      await scheduleTelegramDelete(telegramId, msgId)
    }

    return true
  } catch (error) {
    console.error('[TELEGRAM] sendMessage error:', error)
    return false
  }
}
