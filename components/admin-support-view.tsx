'use client'

import { ArrowLeft, MessageCircle, Clock, CheckCircle2, User } from 'lucide-react'
import type { AppView } from '@/lib/types'
import { MOCK_TICKETS, MOCK_USERS } from '@/lib/store'
import { cn } from '@/lib/utils'

interface AdminSupportViewProps {
  onNavigate: (view: AppView) => void
}

const STATUS_CONFIG = {
  open: { label: 'Открыт', color: 'bg-orange-500/15 text-orange-400', icon: MessageCircle },
  'in-progress': { label: 'В работе', color: 'bg-blue-500/15 text-blue-400', icon: Clock },
  resolved: { label: 'Решён', color: 'bg-primary/15 text-primary', icon: CheckCircle2 },
}

export function AdminSupportView({ onNavigate }: AdminSupportViewProps) {
  const supportAgents = MOCK_USERS.filter((u) => u.role === 'support' || u.role === 'admin' || u.role === 'owner')

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <button
        onClick={() => onNavigate('admin')}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Админ панель
      </button>

      <h1 className="text-xl font-bold text-foreground">Тикеты поддержки</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {MOCK_TICKETS.filter((t) => t.status !== 'resolved').length} активных тикетов
      </p>

      {/* Support agents */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-xs font-medium text-muted-foreground">Агенты поддержки</h3>
        <div className="flex gap-3">
          {supportAgents.map((agent) => (
            <div key={agent.id} className="flex flex-col items-center gap-1">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                  {agent.displayName.charAt(0)}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-primary" />
              </div>
              <span className="max-w-[60px] truncate text-[10px] text-muted-foreground">
                {agent.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tickets */}
      <div className="mt-4 space-y-3">
        {MOCK_TICKETS.map((ticket) => {
          const statusInfo = STATUS_CONFIG[ticket.status]
          const StatusIcon = statusInfo.icon
          return (
            <div key={ticket.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{ticket.subject}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">от @{ticket.username}</p>
                </div>
                <span className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  statusInfo.color
                )}>
                  <StatusIcon className="h-3 w-3" />
                  {statusInfo.label}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  {ticket.assignedTo ? (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">@{ticket.assignedTo}</span>
                    </div>
                  ) : (
                    <select className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none">
                      <option value="">Назначить...</option>
                      {supportAgents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          @{agent.username}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(ticket.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </div>

              {ticket.status !== 'resolved' && (
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 rounded-lg bg-primary/10 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
                    Ответить
                  </button>
                  <button className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/30">
                    Закрыть
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
