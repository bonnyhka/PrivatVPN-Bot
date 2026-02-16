'use client'

import { Users, Key, Headphones, ShieldCheck, Activity, TrendingUp, UserPlus, BarChart3, MessageSquare, Gift } from 'lucide-react'
import type { AppView } from '@/lib/types'
import { MOCK_USERS, MOCK_VPN_KEYS, MOCK_TICKETS, MOCK_REFERRALS } from '@/lib/store'
import { cn } from '@/lib/utils'

interface AdminViewProps {
  onNavigate: (view: AppView) => void
}

export function AdminView({ onNavigate }: AdminViewProps) {
  const stats = [
    {
      label: 'Пользователи',
      value: MOCK_USERS.length,
      change: '+12%',
      icon: Users,
    },
    {
      label: 'Активные ключи',
      value: MOCK_VPN_KEYS.filter((k) => k.status === 'active').length,
      change: '+8%',
      icon: Key,
    },
    {
      label: 'Тикеты',
      value: MOCK_TICKETS.filter((t) => t.status !== 'resolved').length,
      change: '-3',
      icon: Headphones,
    },
    {
      label: 'Доход/мес',
      value: '4.2K',
      change: '+23%',
      icon: TrendingUp,
    },
  ]

  const adminSections: { view: AppView; label: string; description: string; icon: typeof Users; count?: number }[] = [
    {
      view: 'admin-users',
      label: 'Пользователи',
      description: 'Управление ролями и аккаунтами',
      icon: Users,
      count: MOCK_USERS.length,
    },
    {
      view: 'admin-keys',
      label: 'VPN ключи',
      description: 'Выдача и управление ключами',
      icon: Key,
      count: MOCK_VPN_KEYS.length,
    },
    {
      view: 'admin-support',
      label: 'Поддержка',
      description: 'Тикеты и назначение агентов',
      icon: Headphones,
      count: MOCK_TICKETS.filter((t) => t.status !== 'resolved').length,
    },
    {
      view: 'admin-admins',
      label: 'Команда',
      description: 'Выдача ролей и управление',
      icon: ShieldCheck,
      count: MOCK_USERS.filter((u) => u.role !== 'user').length,
    },
    {
      view: 'admin-messages',
      label: 'Сообщения бота',
      description: 'Тексты и шаблоны уведомлений',
      icon: MessageSquare,
      count: 7,
    },
  ]

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Админ панель</h1>
          <p className="text-xs text-muted-foreground">Sentinel VPN</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className={cn(
                  'text-[10px] font-semibold',
                  stat.change.startsWith('+') ? 'text-primary' : 'text-orange-400'
                )}>
                  {stat.change}
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Referral stats */}
      <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Реферальная система</span>
          </div>
          <span className="text-xs font-bold text-primary">{MOCK_REFERRALS.length} приглашений</span>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span>Выплачено: {MOCK_REFERRALS.filter(r => r.status === 'credited').length * 30} руб</span>
          <span>Ожидает: {MOCK_REFERRALS.filter(r => r.status === 'pending').length * 30} руб</span>
        </div>
      </div>

      {/* Sections */}
      <h2 className="mb-3 mt-6 text-sm font-medium text-muted-foreground">Управление</h2>
      <div className="space-y-2">
        {adminSections.map((section) => {
          const Icon = section.icon
          return (
            <button
              key={section.view}
              onClick={() => onNavigate(section.view)}
              className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">{section.label}</p>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
              {section.count !== undefined && (
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-foreground">
                  {section.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Quick actions */}
      <h2 className="mb-3 mt-6 text-sm font-medium text-muted-foreground">Быстрые действия</h2>
      <div className="grid grid-cols-2 gap-3">
        <button className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30">
          <UserPlus className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Выдать ключ</span>
        </button>
        <button className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Статистика</span>
        </button>
      </div>
    </div>
  )
}
