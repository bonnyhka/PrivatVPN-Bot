'use client'

import { useState } from 'react'
import { Copy, Check, Key, Clock, RefreshCw, Shield, AlertTriangle } from 'lucide-react'
import type { User, AppView } from '@/lib/types'
import { PLANS } from '@/lib/store'
import { cn } from '@/lib/utils'

interface MyVpnViewProps {
  user: User
  onNavigate: (view: AppView) => void
}

export function MyVpnView({ user, onNavigate }: MyVpnViewProps) {
  const [copied, setCopied] = useState(false)
  const sub = user.subscription
  const plan = PLANS.find((p) => p.id === sub?.planId)

  const handleCopy = () => {
    if (sub?.vpnKey) {
      navigator.clipboard.writeText(sub.vpnKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!sub || sub.status !== 'active') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 pb-24">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-secondary">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mt-6 text-lg font-bold text-foreground">Нет активной подписки</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Подключите тариф, чтобы получить VPN ключ
        </p>
        <button
          onClick={() => onNavigate('plans')}
          className="mt-6 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          Выбрать тариф
        </button>
      </div>
    )
  }

  const daysLeft = Math.ceil(
    (new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <h1 className="text-xl font-bold text-foreground">Мой VPN</h1>
      <p className="mt-1 text-sm text-muted-foreground">Управление подпиской</p>

      {/* Active plan card */}
      <div className="mt-6 rounded-2xl border border-primary/30 bg-card p-5 glow-green">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">{plan?.name || 'VPN'}</h3>
              <p className="text-xs text-muted-foreground">{plan?.speedLabel} &middot; {plan?.devicesCount} устр.</p>
            </div>
          </div>
          <div className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            Активен
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-[10px]">Истекает</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {new Date(sub.expiresAt).toLocaleDateString('ru-RU')}
            </p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              <span className="text-[10px]">Автопродление</span>
            </div>
            <p className={cn('mt-1 text-sm font-semibold', sub.autoRenew ? 'text-primary' : 'text-muted-foreground')}>
              {sub.autoRenew ? 'Вкл' : 'Выкл'}
            </p>
          </div>
        </div>

        {/* Days left bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Осталось дней</span>
            <span className="font-semibold text-foreground">{daysLeft}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (daysLeft / 30) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* VPN Key */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">VPN ключ</h3>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary p-3">
          <code className="flex-1 truncate font-mono text-xs text-primary">
            {sub.vpnKey}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Скопируйте ключ и вставьте в приложение V2RayNG или Streisand
        </p>
      </div>

      {/* Quick actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('plans')}
          className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
        >
          <p className="text-sm font-semibold text-foreground">Сменить тариф</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Обновить план</p>
        </button>
        <button
          onClick={() => onNavigate('support')}
          className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
        >
          <p className="text-sm font-semibold text-foreground">Поддержка</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Помощь 24/7</p>
        </button>
      </div>
    </div>
  )
}
