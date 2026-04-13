'use client'

import { Check, Copy } from 'lucide-react'
import type { Plan, Subscription } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SubscriptionCardProps {
  plan?: Plan
  subscription?: Subscription
  copied?: boolean
  onCopy?: () => void
  className?: string
}

type Theme = {
  accent: string
  badge: string
  button: string
}

const THEME: Theme = {
  accent: 'bg-primary/90',
  badge: 'bg-primary/10 text-primary border-primary/20',
  button: 'bg-primary hover:brightness-110',
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

function getUsedTrafficLabel(subscription?: Subscription) {
  return formatTraffic(Number(subscription?.trafficUsed || 0))
}

function getRemainingLabel(daysLeft: number) {
  const safeDays = Math.max(0, daysLeft)
  if (safeDays >= 730) return `${Math.floor(safeDays / 365)} лет`
  if (safeDays >= 60) return `${Math.floor(safeDays / 30)} мес`
  return `${safeDays} дн`
}

export function SubscriptionCard({
  plan,
  subscription,
  copied = false,
  onCopy,
  className,
}: SubscriptionCardProps) {
  const theme = THEME
  const daysLeft = Math.ceil(
    ((subscription?.expiresAt ? new Date(subscription.expiresAt).getTime() : Date.now()) - Date.now()) /
      (1000 * 60 * 60 * 24)
  )
  const showCopy = Boolean(subscription?.subscriptionUrl && onCopy)

  return (
    <div className={cn('grain-surface rounded-[22px] border border-border/80 bg-card/95 p-4 shadow-[0_20px_50px_-40px_rgba(0,0,0,0.75)]', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', theme.accent)} />
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">PrivatVPN</p>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <h2 className="truncate text-[22px] font-black leading-none tracking-tight text-foreground">
              {plan?.name || 'Тариф'}
            </h2>
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', theme.badge)}>
              Активна
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[10px] text-muted-foreground">Осталось</p>
          <p className="mt-1 text-xs font-bold text-foreground">{getRemainingLabel(daysLeft)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3">
          <p className="text-[10px] text-muted-foreground">Действует до</p>
          <p className="mt-1 text-sm font-bold text-foreground">До {formatDate(subscription?.expiresAt)}</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3">
          <p className="text-[10px] text-muted-foreground">Использовано</p>
          <p className="mt-1 text-sm font-bold text-foreground">{getUsedTrafficLabel(subscription)}</p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-border/80 bg-secondary/20 p-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Ссылка подписки
        </p>

        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl border border-border bg-card/80 px-3 py-3 font-mono text-xs text-foreground/85">
            {subscription?.subscriptionUrl || 'https://sub.example.com/...'}
          </code>

          {showCopy && (
            <button
              onClick={onCopy}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition-colors active:scale-95',
                theme.button
              )}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
