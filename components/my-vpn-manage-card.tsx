'use client'

import { Check, Copy, Link2, ShieldCheck } from 'lucide-react'
import type { Plan, Subscription } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MyVpnManageCardProps {
  plan?: Plan
  subscription?: Subscription
  copied?: boolean
  onCopy?: () => void
  onConnect?: () => void
  onReset?: () => void
  isResetting?: boolean
  className?: string
}

type Theme = {
  dot: string
  badge: string
  button: string
  buttonGhost: string
  copy: string
}

const THEME: Theme = {
  dot: 'bg-primary/90',
  badge: 'border-primary/20 bg-primary/10 text-primary',
  button: 'bg-primary hover:brightness-110',
  buttonGhost: 'border-border bg-secondary/40 text-foreground hover:bg-secondary/55',
  copy: 'bg-secondary/55 text-foreground hover:bg-secondary/70',
}

function formatDate(value?: string | null) {
  if (!value) return '--'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '--'
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTraffic(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Б'
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

function getRemainingLabel(value?: string | null) {
  if (!value) return '--'
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )
  if (daysLeft >= 730) return `${Math.floor(daysLeft / 365)} лет`
  if (daysLeft >= 60) return `${Math.floor(daysLeft / 30)} мес`
  return `${daysLeft} дн`
}

export function MyVpnManageCard({
  plan,
  subscription,
  copied = false,
  onCopy,
  onConnect,
  onReset,
  isResetting = false,
  className,
}: MyVpnManageCardProps) {
  const theme = THEME
  const showCopy = Boolean(subscription?.subscriptionUrl && onCopy)

  return (
    <div className={cn('grain-surface relative overflow-hidden rounded-[26px] border border-border/80 bg-card/95 p-4 shadow-[0_24px_60px_-45px_rgba(0,0,0,0.8)]', className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(120,130,255,0.08),transparent_48%)]" />
      <img
        src="/images/referral-hero.gif"
        alt=""
        className="pointer-events-none absolute -right-6 -top-4 h-[125%] w-[40%] rotate-[8deg] object-contain opacity-40"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', theme.dot)} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">PrivatVPN</p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-[21px] font-black leading-none tracking-tight text-foreground">
              {plan?.name || 'Тариф'}
            </h2>
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', theme.badge)}>
              Активна
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Ключ активен
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3">
          <p className="text-[10px] text-muted-foreground">Действует до</p>
          <p className="mt-1 text-sm font-bold text-foreground">До {formatDate(subscription?.expiresAt)}</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3">
          <p className="text-[10px] text-muted-foreground">Осталось</p>
          <p className="mt-1 text-sm font-bold text-foreground">{getRemainingLabel(subscription?.expiresAt)}</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3">
          <p className="text-[10px] text-muted-foreground">Использовано</p>
          <p className="mt-1 text-sm font-bold text-foreground">
            {formatTraffic(Number(subscription?.trafficUsed || 0))}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-border/80 bg-secondary/20 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link2 className="h-4 w-4" />
            <p className="text-[10px] font-medium uppercase tracking-[0.22em]">Ссылка подписки</p>
          </div>
          <p className="text-[10px] text-muted-foreground">Импорт в клиент</p>
        </div>

        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl border border-border bg-card/80 px-3 py-3 font-mono text-xs text-foreground/85">
            {subscription?.subscriptionUrl || 'https://sub.example.com/...'}
          </code>

          {showCopy && (
            <button
              onClick={onCopy}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors active:scale-95',
                theme.copy
              )}
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={onConnect}
          className={cn(
            'flex items-center justify-center rounded-2xl py-3 text-sm font-bold text-white transition-colors active:scale-[0.98]',
            theme.button
          )}
        >
          Подключить устройства
        </button>

        <button
          onClick={onReset}
          className={cn(
            'rounded-2xl border py-3 text-sm font-semibold transition-colors active:scale-[0.98]',
            theme.buttonGhost,
            'hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400'
          )}
        >
          {isResetting ? 'Сброс...' : 'Перевыпустить ключ'}
        </button>
      </div>
    </div>
  )
}
