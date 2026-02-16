'use client'

import { useState } from 'react'
import { ArrowLeft, MessageSquare, Eye, EyeOff, Save, ChevronDown, Code, Send } from 'lucide-react'
import type { AppView, BotMessage } from '@/lib/types'
import { BOT_MESSAGES } from '@/lib/store'
import { cn } from '@/lib/utils'

interface AdminMessagesViewProps {
  onNavigate: (view: AppView) => void
}

function formatHtmlPreview(text: string): string {
  return text
    .replace(/<b>/g, '')
    .replace(/<\/b>/g, '')
    .replace(/<code>/g, '')
    .replace(/<\/code>/g, '')
    .replace(/\{[^}]+\}/g, (match) => `[${match}]`)
}

export function AdminMessagesView({ onNavigate }: AdminMessagesViewProps) {
  const [messages, setMessages] = useState<BotMessage[]>(BOT_MESSAGES)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const handleStartEdit = (msg: BotMessage) => {
    setEditingId(msg.id)
    setEditText(msg.text)
    setExpandedId(msg.id)
  }

  const handleSave = (id: string) => {
    setMessages(prev => prev.map(m =>
      m.id === id ? { ...m, text: editText } : m
    ))
    setEditingId(null)
  }

  const triggerLabels: Record<string, string> = {
    '/start': 'Команда /start',
    'payment_success': 'После оплаты',
    'key_expiring_3d': 'За 3 дня до истечения',
    'key_expired': 'Подписка истекла',
    'referral_reward': 'Реферальный бонус',
    'support_reply': 'Ответ поддержки',
    'manual_broadcast': 'Ручная рассылка',
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <button
        onClick={() => onNavigate('admin')}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Админ панель
      </button>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Сообщения бота</h1>
          <p className="text-xs text-muted-foreground">{messages.length} шаблонов</p>
        </div>
      </div>

      <p className="mt-4 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
        Здесь можно редактировать тексты, которые бот отправляет пользователям. Используйте HTML-теги {'<b>'}, {'<code>'} и переменные в фигурных скобках.
      </p>

      {/* Messages list */}
      <div className="mt-4 space-y-3">
        {messages.map((msg) => {
          const isExpanded = expandedId === msg.id
          const isEditing = editingId === msg.id
          const isPreview = previewId === msg.id

          return (
            <div key={msg.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <button
                onClick={() => {
                  setExpandedId(isExpanded ? null : msg.id)
                  setPreviewId(null)
                }}
                className="flex w-full items-center gap-3 p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Send className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">{msg.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {triggerLabels[msg.trigger] || msg.trigger}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {msg.parseMode}
                  </span>
                  <ChevronDown className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-180'
                  )} />
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 pb-4 pt-3">
                  {/* Toggle preview/code */}
                  <div className="mb-3 flex gap-2">
                    <button
                      onClick={() => setPreviewId(isPreview ? null : msg.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                        isPreview
                          ? 'bg-primary/10 text-primary'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {isPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {isPreview ? 'Код' : 'Превью'}
                    </button>
                    {!isEditing && (
                      <button
                        onClick={() => handleStartEdit(msg)}
                        className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Code className="h-3 w-3" />
                        Редактировать
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={10}
                        className="w-full resize-none rounded-lg border border-border bg-secondary p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleSave(msg.id)}
                          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Сохранить
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/30"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : isPreview ? (
                    <div className="rounded-xl bg-secondary p-4">
                      <div className="rounded-lg bg-[hsl(150_18%_12%)] p-3">
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                          {formatHtmlPreview(msg.text)}
                        </p>
                      </div>
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        * Превью без HTML форматирования. В Telegram текст будет с разметкой.
                      </p>
                    </div>
                  ) : (
                    <pre className="overflow-x-auto rounded-lg bg-secondary p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                      {msg.text}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
