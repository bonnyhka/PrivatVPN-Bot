'use client'

import { useState, useEffect, useRef } from 'react'
import { Headphones, Send, Clock, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Paperclip, X, Trash2 } from 'lucide-react'
import type { AppView } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AdminSupportViewProps {
  onNavigate: (view: AppView) => void
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Открыт', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  in_progress: { label: 'В работе', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  resolved: { label: 'Решён', color: 'text-primary', bg: 'bg-primary/10' },
  closed: { label: 'Закрыт', color: 'text-muted-foreground', bg: 'bg-secondary' },
}

function StatusDropdown({ status, onChange }: { status: string, onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false)
  const current = STATUS_LABELS[status] || STATUS_LABELS.open

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className={cn("flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold transition-colors", current.bg, current.color)}
      >
        <span className="relative flex h-2 w-2">
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", status === 'open' ? 'bg-yellow-400' : 'hidden')} />
          <span className={cn("relative inline-flex h-2 w-2 rounded-full",
            status === 'open' ? 'bg-yellow-400' :
            status === 'in_progress' ? 'bg-blue-400' :
            status === 'resolved' ? 'bg-primary' : 'bg-muted-foreground'
          )} />
        </span>
        {current.label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-xl border-border bg-card shadow-lg animate-in fade-in zoom-in-95 ring-1 ring-white/10">
            {(['open', 'in_progress', 'resolved', 'closed'] as const).map(s => {
              const cfg = STATUS_LABELS[s]
              return (
                <button
                  key={s}
                  onClick={() => { onChange(s); setOpen(false) }}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-3 text-xs transition-colors hover:bg-secondary",
                    status === s ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", 
                    s === 'open' ? 'bg-yellow-400' :
                    s === 'in_progress' ? 'bg-blue-400' :
                    s === 'resolved' ? 'bg-primary' : 'bg-muted-foreground'
                  )} />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function MsgBubble({ msg }: { msg: any }) {
  const [lightbox, setLightbox] = useState(false)

  if (msg.isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="rounded-full bg-secondary/80 px-4 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
          {msg.body}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex', msg.isAdmin ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[80%] rounded-2xl text-sm overflow-hidden',
        msg.isAdmin
          ? 'rounded-tr-sm bg-primary text-primary-foreground'
          : 'rounded-tl-sm bg-card border border-border text-foreground'
      )}>
        {/* Image */}
        {msg.imageUrl && (
          <button onClick={() => setLightbox(true)} className="block w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={msg.imageUrl} alt="Вложение" className="max-h-60 w-full object-cover" />
          </button>
        )}

        {/* Body */}
        {msg.body && (
          <div className="px-4 py-2.5">
            <p>{msg.body}</p>
            <p className={cn('mt-1 text-[10px]', msg.isAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
              {msg.isAdmin ? 'Поддержка · ' : 'Пользователь · '}
              {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}

        {msg.imageUrl && !msg.body && (
          <p className={cn('px-3 pb-2 text-[10px]', msg.isAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            {msg.isAdmin ? 'Поддержка · ' : 'Пользователь · '}
            {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={msg.imageUrl} alt="Вложение" className="max-h-full max-w-full rounded-xl object-contain" />
          <button onClick={() => setLightbox(false)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}

export function AdminSupportView({ onNavigate }: AdminSupportViewProps) {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTicket, setActiveTicket] = useState<any | null>(null)
  const [replyText, setReplyText] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('open')
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function loadTickets() {
    setLoading(true)
    fetch('/api/admin/tickets')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTickets(d) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTickets() }, [])

  async function changeStatus(ticketId: string, status: string) {
    await fetch('/api/admin/tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, status }),
    })
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t))
    if (activeTicket?.id === ticketId) setActiveTicket((t: any) => ({ ...t, status }))
  }

  async function deleteTicket(id: string) {
    if (!confirm('Вы уверены, что хотите навсегда удалить этот тикет?')) return
    await fetch(`/api/admin/tickets?id=${id}`, { method: 'DELETE' })
    setTickets(prev => prev.filter(t => t.id !== id))
    setActiveTicket(null)
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

  async function sendReply() {
    if ((!replyText.trim() && !pendingImage) || !activeTicket) return
    setUploading(true)

    let imageUrl: string | null = null
    if (pendingImage) {
      const fd = new FormData()
      fd.append('file', pendingImage)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        imageUrl = data.url || null
      }
    }

    const res = await fetch(`/api/tickets/${activeTicket.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: replyText || '', isAdmin: true, imageUrl }),
    })
    const msg = await res.json()
    if (!msg.error) {
      setActiveTicket((t: any) => ({ ...t, messages: [...(t.messages || []), msg], status: 'in_progress' }))
      setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, status: 'in_progress' } : t))
      setReplyText('')
      removePendingImage()
    }
    setUploading(false)
  }

  const filtered = tickets.filter(t => filter === 'all' || t.status === filter)
  const openCount = tickets.filter(t => t.status === 'open').length

  if (activeTicket) {
    return (
      <div className="min-h-screen px-4 pb-48 pt-6">
        <button onClick={() => setActiveTicket(null)} className="mb-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Назад
        </button>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-foreground">{activeTicket.subject}</h1>
            <p className="text-xs text-muted-foreground">{activeTicket.user?.displayName} (@{activeTicket.user?.username})</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => deleteTicket(activeTicket.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              title="Удалить тикет"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <StatusDropdown status={activeTicket.status} onChange={(s) => changeStatus(activeTicket.id, s)} />
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {activeTicket.messages?.map((msg: any) => (
            <MsgBubble key={msg.id} msg={msg} />
          ))}
        </div>

        <div className="fixed bottom-[96px] left-4 right-4 space-y-2">
          {/* Image preview strip */}
          {pendingImageUrl && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingImageUrl} alt="preview" className="h-10 w-10 rounded-lg object-cover" />
              <span className="flex-1 truncate text-xs text-muted-foreground">{pendingImage?.name || 'Вставленное изображение'}</span>
              <button onClick={removePendingImage} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendReply()}
              onPaste={handlePaste}
              placeholder="Ответ пользователю..."
              className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              onClick={sendReply}
              disabled={(!replyText.trim() && !pendingImage) || uploading}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            >
              {uploading
                ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                : <Send className="h-4 w-4" />
              }
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <button onClick={() => onNavigate('admin')} className="mb-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Назад
      </button>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Headphones className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Тикеты</h1>
            <p className="mt-1 text-sm text-muted-foreground">{openCount} открытых</p>
          </div>
        </div>
        <button onClick={loadTickets} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card">
          <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto">
        {(['all', 'open', 'in_progress', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors',
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {f === 'all' ? 'Все' : STATUS_LABELS[f]?.label}
            {f === 'open' && openCount > 0 && (
              <span className="ml-1.5 rounded-full bg-yellow-400/20 px-1.5 text-yellow-400">{openCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Тикетов нет</div>
        ) : filtered.map(ticket => {
          const cfg = STATUS_LABELS[ticket.status] || STATUS_LABELS.open
          return (
            <button
              key={ticket.id}
              onClick={() => setActiveTicket(ticket)}
              className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
            >
              {ticket.user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ticket.user.avatar} alt={ticket.user.displayName} className="h-10 w-10 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-foreground">
                  {ticket.user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{ticket.subject}</p>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0', cfg.bg, cfg.color)}>
                    {cfg.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {ticket.user?.displayName} · {ticket.messageCount} сообщ.
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                  {new Date(ticket.updatedAt).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
