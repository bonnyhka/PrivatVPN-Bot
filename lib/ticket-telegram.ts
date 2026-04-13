import { sendTelegramMessage } from '@/lib/telegram'

const WEB_APP_URL = process.env.WEB_APP_URL || 'https://privatevp.space/'

const OPEN_MINIAPP_MARKUP = {
  inline_keyboard: [[{ text: 'Открыть миниапп', web_app: { url: WEB_APP_URL } }]],
}

function escapeHtml(input: string) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getTicketStatusLabel(status: string) {
  switch (status) {
    case 'open':
      return 'Открыт'
    case 'in_progress':
      return 'В работе'
    case 'resolved':
      return 'Решён'
    case 'closed':
      return 'Закрыт'
    default:
      return status
  }
}

export async function notifyTicketReply(params: {
  telegramId?: string | null
  subject?: string | null
}) {
  if (!params.telegramId) return false

  const subjectLine = params.subject
    ? `\nТикет: <b>${escapeHtml(params.subject)}</b>`
    : ''

  return sendTelegramMessage(
    params.telegramId,
    `📩 <b>Пришёл ответ от поддержки</b>${subjectLine}\n\n` +
      `Зайдите в миниапп PrivatVPN и откройте раздел <b>Поддержка</b>, чтобы посмотреть сообщение.`,
    OPEN_MINIAPP_MARKUP,
  )
}

export async function notifyTicketStatusChange(params: {
  telegramId?: string | null
  subject?: string | null
  status: string
}) {
  if (!params.telegramId) return false

  const statusLabel = getTicketStatusLabel(params.status)
  const subjectLine = params.subject
    ? `\nТикет: <b>${escapeHtml(params.subject)}</b>`
    : ''

  return sendTelegramMessage(
    params.telegramId,
    `🔔 <b>Статус обращения изменён</b>${subjectLine}\n` +
      `Новый статус: <b>${escapeHtml(statusLabel)}</b>\n\n` +
      `Зайдите в миниапп PrivatVPN и откройте раздел <b>Поддержка</b>, чтобы посмотреть детали.`,
    OPEN_MINIAPP_MARKUP,
  )
}
