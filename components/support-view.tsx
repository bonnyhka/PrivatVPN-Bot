'use client'

import { useState } from 'react'
import { MessageCircle, Send, HelpCircle, Book, ChevronRight, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

const FAQ = [
  {
    q: 'Как подключить VPN?',
    a: 'Скопируйте ключ из раздела "Мой VPN" и вставьте его в приложение V2RayNG (Android) или Streisand (iOS). Нажмите подключить.',
  },
  {
    q: 'Какие протоколы поддерживаются?',
    a: 'Мы используем VLESS + WebSocket + TLS для максимальной скорости и безопасности.',
  },
  {
    q: 'Можно ли использовать на нескольких устройствах?',
    a: 'Да, количество устройств зависит от вашего тарифа. От 1 до 10 устройств одновременно.',
  },
  {
    q: 'Как продлить подписку?',
    a: 'Подписка продлевается автоматически. Вы можете управлять автопродлением в разделе "Мой VPN".',
  },
  {
    q: 'Что делать если VPN не работает?',
    a: 'Попробуйте сменить сервер в разделе "VPN". Если проблема сохраняется, напишите в поддержку.',
  },
]

export function SupportView() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleSend = () => {
    if (message.trim()) {
      setSent(true)
      setMessage('')
      setTimeout(() => setSent(false), 3000)
    }
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <h1 className="text-xl font-bold text-foreground">Поддержка</h1>
      <p className="mt-1 text-sm text-muted-foreground">Мы всегда на связи</p>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
          <MessageCircle className="h-6 w-6 text-primary" />
          <span className="text-xs font-medium text-foreground">Чат с поддержкой</span>
          <span className="text-[10px] text-muted-foreground">Ответ за 5 мин</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
          <Book className="h-6 w-6 text-primary" />
          <span className="text-xs font-medium text-foreground">База знаний</span>
          <span className="text-[10px] text-muted-foreground">Инструкции</span>
        </div>
      </div>

      {/* FAQ */}
      <h2 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold text-foreground">
        <HelpCircle className="h-4 w-4 text-primary" />
        Частые вопросы
      </h2>
      <div className="space-y-2">
        {FAQ.map((item, i) => (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="flex w-full items-center justify-between p-4"
            >
              <span className="text-left text-sm font-medium text-foreground">{item.q}</span>
              <ChevronRight className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                openFaq === i && 'rotate-90'
              )} />
            </button>
            {openFaq === i && (
              <div className="border-t border-border px-4 pb-4 pt-3">
                <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick message */}
      <h2 className="mb-3 mt-6 text-sm font-semibold text-foreground">Написать в поддержку</h2>
      <div className="rounded-xl border border-border bg-card p-4">
        {sent ? (
          <div className="flex flex-col items-center py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">Сообщение отправлено!</p>
            <p className="mt-1 text-xs text-muted-foreground">Ответим в течение 5 минут</p>
          </div>
        ) : (
          <>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишите вашу проблему..."
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-secondary p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className={cn(
                'mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all',
                message.trim()
                  ? 'bg-primary text-primary-foreground hover:brightness-110'
                  : 'cursor-not-allowed bg-secondary text-muted-foreground'
              )}
            >
              <Send className="h-4 w-4" />
              Отправить
            </button>
          </>
        )}
      </div>

      {/* Telegram link */}
      <a
        href="#"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ExternalLink className="h-4 w-4" />
        Написать в Telegram бот
      </a>
    </div>
  )
}
