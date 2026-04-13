'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, HelpCircle, ChevronRight, Plus, Clock, CheckCircle2, AlertCircle, Paperclip, X, ImageIcon, Zap, LifeBuoy, BookOpen, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTelegramUser } from '@/components/providers/telegram-provider'
import { AnimatedContainer, AnimatedItem } from '@/components/ui/animated-view'

const FAQ = [
  {
    q: 'VPN не подключается, что делать?',
    a: 'Сначала обновите конфигурацию в приложении (кнопка «Обновить» или «Update»). Появятся резервные узлы с пометкой [ALT] для сложных сетей. Если основные недоступны, альтернативные обычно работают. Также попробуйте переключиться на ShadowSocks: порт зависит от тарифа и подтягивается автоматически после обновления подписки.',
  },
  {
    q: 'Как добавить подписку в приложение?',
    a: 'Откройте раздел «Мой VPN» → нажмите «Скопировать ссылку» → перейдите в Hiddify (или Streisand / V2RayNG) → «Добавить» / «Import from clipboard». Подписка обновляется автоматически каждые 6 часов.',
  },
  {
    q: 'Какое приложение лучше?',
    a: 'Рекомендуем Hiddify Next (Android / iOS / Windows). Он поддерживает все наши протоколы, включает авто-выбор лучшего сервера и не требует настройки.',
  },
  {
    q: 'Discord / игры лагают на VPN',
    a: 'Переключитесь на удобную страну в приложении. Германия #1 обычно даёт самый низкий пинг для стран СНГ. Также попробуйте включить режим «UDP» или «Game Mode» если он есть в вашем клиенте.',
  },
  {
    q: 'Сколько устройств можно подключить?',
    a: 'Scout — 1 устройство, Guardian — 3, Fortress — 5, Citadel — до 10. Подключения считаются одновременными. Один и тот же аккаунт можно использовать на разных устройствах в пределах лимита.',
  },
  {
    q: 'Как продлить или сменить тариф?',
    a: 'Напишите командой /start в бот PrivatVPN — там будут кнопки продления и смены тарифа. Текущая подписка сохраняется до конца оплаченного периода.',
  },
  {
    q: 'Что такое VLESS и ShadowSocks?',
    a: 'Оба — протоколы VPN. VLESS Reality обычно стабильнее в строгих сетях и выглядит как обычный HTTPS. ShadowSocks часто быстрее на нестабильных соединениях. Попробуйте оба и выберите лучший для вас.',
  },
  {
    q: '📱 Что такое узлы «Мобильный» (Hysteria2)?',
    a: 'Hysteria2 — протокол QUIC/UDP для сетей с потерями и нестабильной связью. Если соединение проседает — попробуйте узел с пометкой 📱.\n\n⚠️ Не рекомендуется для ПК и онлайн-игр (агрессивная передача пакетов вызывает скачки пинга). Используйте VLESS на компьютерах.',
  },
]

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  open: { label: 'Открыт', icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  in_progress: { label: 'В работе', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  resolved: { label: 'Решён', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  closed: { label: 'Закрыт', icon: CheckCircle2, color: 'text-muted-foreground', bg: 'bg-muted/40' },
}

function MessageBubble({ msg }: { msg: any }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (msg.isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="rounded-full bg-secondary/80 px-4 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm text-center">
          {msg.body}
        </div>
      </div>
    )
  }

  const fromAdmin = msg.isAdmin
  return (
    <div className={cn('flex', fromAdmin ? 'justify-start' : 'justify-end')}>
      <div className={cn(
        'max-w-[80%] rounded-2xl text-sm overflow-hidden',
        fromAdmin
          ? 'rounded-tl-sm bg-card border border-border text-foreground'
          : 'rounded-tr-sm bg-primary text-primary-foreground'
      )}>
        {msg.imageUrl && (
          <button onClick={() => setLightboxOpen(true)} className="block w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={msg.imageUrl} alt="Вложение" className="max-h-60 w-full object-cover" />
          </button>
        )}
        {msg.body && (
          <div className="px-4 py-2.5">
            <p>{msg.body}</p>
            <p className={cn('mt-1 text-[10px]', fromAdmin ? 'text-muted-foreground' : 'text-primary-foreground/70')}>
              {fromAdmin ? 'Поддержка · ' : ''}
              {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}
        {msg.imageUrl && !msg.body && (
          <p className={cn('px-3 pb-2 text-[10px]', fromAdmin ? 'text-muted-foreground' : 'text-primary-foreground/70')}>
            {fromAdmin ? 'Поддержка · ' : ''}
            {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightboxOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={msg.imageUrl} alt="Вложение" className="max-h-full max-w-full rounded-xl object-contain" />
          <button onClick={() => setLightboxOpen(false)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}

export function SupportView() {
  const { user } = useTelegramUser()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [showNew, setShowNew] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTicket, setActiveTicket] = useState<any | null>(null)
  const [replyText, setReplyText] = useState('')
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user?.id && user.id !== 'opt') {
      fetch('/api/tickets')
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setTickets(d) })
        .catch(console.error)
    }
  }, [user?.id])

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingImage(file)
    setPendingImageUrl(URL.createObjectURL(file))
  }

  function removePendingImage() {
    setPendingImage(null)
    if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl)
    setPendingImageUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          setPendingImage(file)
          setPendingImageUrl(URL.createObjectURL(file))
          e.preventDefault()
          break
        }
      }
    }
  }

  async function uploadImage(file: File): Promise<string | null> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) return null
    const data = await res.json()
    return data.url || null
  }

  async function sendTicket() {
    if (!subject.trim() || !message.trim() || !user?.id || user.id === 'opt') return
    setSending(true)
    let imageUrl: string | null = null
    if (pendingImage) imageUrl = await uploadImage(pendingImage)
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message, imageUrl }),
    })
    const ticket = await res.json()
    if (!ticket.error) {
      setTickets(prev => [ticket, ...prev])
      setShowNew(false)
      setSubject('')
      setMessage('')
      removePendingImage()
    }
    setSending(false)
  }

  async function sendReply() {
    if ((!replyText.trim() && !pendingImage) || !activeTicket) return
    setUploading(true)
    let imageUrl: string | null = null
    if (pendingImage) imageUrl = await uploadImage(pendingImage)
    const res = await fetch(`/api/tickets/${activeTicket.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: replyText || '', isAdmin: false, imageUrl }),
    })
    const msg = await res.json()
    if (!msg.error) {
      setActiveTicket((t: any) => ({ ...t, messages: [...t.messages, msg] }))
      setReplyText('')
      removePendingImage()
    }
    setUploading(false)
  }

  // --- Active ticket view ---
  if (activeTicket) {
    const statusCfg = STATUS_CONFIG[activeTicket.status] || STATUS_CONFIG.open
    const StatusIcon = statusCfg.icon
    return (
      <div className="min-h-screen px-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-6">
        <button onClick={() => setActiveTicket(null)} className="mb-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          ← Назад к поддержке
        </button>
        <div className="mb-5 flex items-start justify-between gap-3">
          <h1 className="text-base font-bold text-foreground leading-tight">{activeTicket.subject}</h1>
          <span className={cn('flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold', statusCfg.color, statusCfg.bg)}>
            <StatusIcon className="h-3 w-3" />
            {statusCfg.label}
          </span>
        </div>
        <div className="space-y-3">
          {activeTicket.messages?.map((msg: any) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </div>

        {activeTicket.status !== 'resolved' && activeTicket.status !== 'closed' && (
          <div className="sticky bottom-[calc(env(safe-area-inset-bottom,0px)+8px)] z-20 space-y-2 rounded-2xl bg-gradient-to-t from-background/95 via-background/80 to-transparent pt-4">
            {pendingImageUrl && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pendingImageUrl} alt="preview" className="h-10 w-10 rounded-lg object-cover" />
                <span className="flex-1 truncate text-xs text-muted-foreground">{pendingImage?.name || 'Изображение'}</span>
                <button onClick={removePendingImage} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            )}
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <button onClick={() => fileInputRef.current?.click()} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground">
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendReply()}
                onPaste={handlePaste}
                placeholder="Ваш ответ..."
                className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button
                onClick={sendReply}
                disabled={(!replyText.trim() && !pendingImage) || uploading}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
              >
                {uploading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // --- Main support view ---
  return (
    <AnimatedContainer className="min-h-screen pb-28">
      {/* Hero header */}
      <AnimatedItem className="relative px-4 pb-6 pt-10">
        <div className="pointer-events-none absolute left-2 top-8 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
        <div className="relative">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/15 shadow-[0_10px_30px_-18px_rgba(37,99,235,0.55)]">
            <LifeBuoy className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Помощь</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ответим в течение нескольких часов</p>
        </div>
      </AnimatedItem>

      <div className="px-4 space-y-5">
        {/* Quick actions */}
        <AnimatedItem className="grid grid-cols-2 gap-3">
          <a
            href="https://t.me/privatruvpn_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 transition-all hover:bg-primary/10"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
              <Send className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Telegram бот</p>
              <p className="text-xs text-muted-foreground">Управление тарифом</p>
            </div>
          </a>
          <a
            href="https://t.me/privatvpnru"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/20"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Наш канал</p>
              <p className="text-xs text-muted-foreground">Новости и статусы</p>
            </div>
          </a>
        </AnimatedItem>

        {/* Tips row */}
        <AnimatedItem className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold text-foreground">Быстрая помощь</p>
          </div>
          <div className="space-y-2.5">
            {[
              'Если VPN не работает — обновите подписку, чтобы получить резервные порты [ALT]',
              'Пинг скачет? Попробуйте переключить ноду',
              'Медленно? Попробуйте ShadowSocks вместо VLESS',
              'Если связь нестабильна — попробуйте узел с пометкой 📱 или переключитесь на другой протокол',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-[9px] font-bold text-amber-400">{i + 1}</span>
                {tip}
              </div>
            ))}
          </div>
        </AnimatedItem>

        {/* Open ticket button */}
        <AnimatedItem>
          <button
            onClick={() => setShowNew(v => !v)}
            className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-4 text-left transition-all hover:brightness-110"
          >
            <div>
              <p className="font-semibold text-primary-foreground">Написать в поддержку</p>
              <p className="text-xs text-primary-foreground/70 mt-0.5">Решаем любые вопросы</p>
            </div>
            <Plus className={cn('h-5 w-5 text-primary-foreground transition-transform', showNew && 'rotate-45')} />
          </button>

          {showNew && (
            <div className="mt-3 rounded-2xl border border-border bg-card p-4 space-y-3">
              <input
                type="text"
                placeholder="Тема вопроса"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
              />
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                onPaste={handlePaste}
                placeholder="Опишите проблему подробнее..."
                rows={4}
                className="w-full resize-none rounded-xl border border-border bg-secondary p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
              />
              {pendingImageUrl && (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pendingImageUrl} alt="preview" className="h-10 w-10 rounded-lg object-cover" />
                  <span className="flex-1 truncate text-xs text-muted-foreground">{pendingImage?.name || 'Изображение'}</span>
                  <button onClick={removePendingImage} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
              )}
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  onClick={sendTicket}
                  disabled={sending || !subject.trim() || !message.trim()}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {sending ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            </div>
          )}
        </AnimatedItem>

        {/* My tickets */}
        {tickets.length > 0 ? (
          <AnimatedItem>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Мои обращения</h2>
            <div className="space-y-2">
              {tickets.map(ticket => {
                const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
                const StatusIcon = cfg.icon
                const lastMsg = ticket.messages?.[ticket.messages.length - 1]
                return (
                  <button
                    key={ticket.id}
                    onClick={() => setActiveTicket(ticket)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                      <MessageCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ticket.subject}</p>
                      {lastMsg?.body && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsg.body}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', cfg.color, cfg.bg)}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        {cfg.label}
                      </span>
                      {ticket.messages?.some((m: any) => m.imageUrl) && (
                        <ImageIcon className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </AnimatedItem>
        ) : null}

        {/* FAQ */}
        <AnimatedItem>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            Частые вопросы
          </h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <span className="text-sm font-medium text-foreground pr-2 leading-snug">{item.q}</span>
                  <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', openFaq === i && 'rotate-90')} />
                </button>
                {openFaq === i && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </AnimatedItem>

        {/* Footer note */}
        <AnimatedItem className="flex items-center justify-center gap-2 py-2">
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Среднее время ответа — 2–4 часа</span>
        </AnimatedItem>
      </div>
    </AnimatedContainer>
  )
}
