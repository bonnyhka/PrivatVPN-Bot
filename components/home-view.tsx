'use client'

import { useState } from 'react'
import {
  Shield,
  Copy,
  Check,
  Globe,
  Gift,
  Users,
  ChevronRight,
  Smartphone,
  Zap,
  Clock,
  CreditCard,
  Wifi,
  Star,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User, AppView } from '@/lib/types'
import { PLANS, LOCATIONS, MOCK_REFERRALS } from '@/lib/store'

interface HomeViewProps {
  user: User
  onNavigate: (view: AppView) => void
}

export function HomeView({ user, onNavigate }: HomeViewProps) {
  const [copied, setCopied] = useState(false)
  const sub = user.subscription
  const plan = PLANS.find((p) => p.id === sub?.planId)
  const hasSubscription = sub?.status === 'active'
  const referralCount = MOCK_REFERRALS.filter((r) => r.fromUserId === user.id).length

  const daysLeft = sub?.expiresAt
    ? Math.ceil(
        (new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : 0

  const handleCopyKey = () => {
    if (sub?.vpnKey) {
      navigator.clipboard.writeText(sub.vpnKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex min-h-screen flex-col px-4 pb-24 pt-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">PrivatVPN</h1>
            <p className="text-[10px] text-muted-foreground">
              {user.displayName} &middot; @{user.username}
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('support')}
          className="rounded-lg bg-secondary px-3 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Помощь
        </button>
      </div>

      {/* Subscription Card -- bank card style */}
      {hasSubscription ? (
        <div className="sub-card relative mb-5 overflow-hidden rounded-2xl p-[1px]">
          <div className="sub-card-inner relative overflow-hidden rounded-2xl bg-card p-5">
            {/* Holographic shimmer overlay */}
            <div className="sub-card-shimmer pointer-events-none absolute inset-0 rounded-2xl opacity-[0.07]" />

            {/* Card top row */}
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    PrivatVPN
                  </p>
                  <p className="text-sm font-bold text-foreground">{plan?.name || 'Plan'}</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  ACTIVE
                </span>
              </div>
            </div>

            {/* Card number area -- VPN key preview */}
            <div className="relative mt-5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                VPN ключ
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 truncate font-mono text-xs tracking-wide text-foreground/80">
                  {sub?.vpnKey || 'vless://...'}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="shrink-0 rounded-lg bg-primary/10 p-1.5 text-primary transition-all hover:bg-primary/20 active:scale-95"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Card bottom row -- stats */}
            <div className="relative mt-5 flex items-end justify-between">
              <div className="flex gap-5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    До
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {sub?.expiresAt
                      ? new Date(sub.expiresAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        })
                      : '--'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Устройства
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {plan?.devicesCount || 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Скорость
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {plan?.speedLabel || '--'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Wifi className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold text-primary">{daysLeft}д</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative mt-3">
              <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                  style={{ width: `${Math.min(100, (daysLeft / (plan?.periodMonths ? plan.periodMonths * 30 : 30)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* No subscription state */
        <button
          onClick={() => onNavigate('plans')}
          className="group relative mb-5 overflow-hidden rounded-2xl border border-dashed border-border bg-card p-6 text-center transition-all hover:border-primary/40"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <CreditCard className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <p className="mt-3 text-sm font-bold text-foreground">Нет активной подписки</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Подключите тариф от 50 руб/мес
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-all group-hover:brightness-110">
            Выбрать тариф
            <ArrowRight className="h-3 w-3" />
          </div>
        </button>
      )}

      {/* Quick Actions */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('my-vpn')}
          className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:border-primary/30"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-primary/15">
            <Smartphone className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-foreground">Мой VPN</p>
            <p className="text-[10px] text-muted-foreground">Ключ и подписка</p>
          </div>
        </button>
        <button
          onClick={() => onNavigate('plans')}
          className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:border-primary/30"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-primary/15">
            <Star className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-foreground">Тарифы</p>
            <p className="text-[10px] text-muted-foreground">от 50 руб/мес</p>
          </div>
        </button>
      </div>

      {/* Referral Banner */}
      <button
        onClick={() => onNavigate('referral')}
        className="group mb-5 flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5 transition-colors hover:border-primary/40"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">
            Пригласи друга -- получи 30 руб
          </p>
          <p className="text-[10px] text-muted-foreground">
            {referralCount > 0
              ? `Уже пригласили: ${referralCount} друзей`
              : 'Делись ссылкой и зарабатывай'}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1">
          <Users className="h-3 w-3 text-primary" />
          <span className="text-xs font-bold text-primary">{referralCount}</span>
        </div>
      </button>

      {/* Servers status */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Серверы</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {LOCATIONS.length} локаций
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {LOCATIONS.slice(0, 6).map((loc) => (
            <div
              key={loc.flag}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/20"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-foreground">
                {loc.flag}
              </div>
              <span className="text-[10px] font-medium text-foreground">{loc.country}</span>
              <div className="flex items-center gap-1">
                <Zap className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground">{loc.ping} мс</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    'h-full rounded-full',
                    loc.load < 40
                      ? 'bg-primary'
                      : loc.load < 60
                      ? 'bg-yellow-500'
                      : 'bg-orange-500'
                  )}
                  style={{ width: `${loc.load}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How to connect guide */}
      <div className="mb-4">
        <h2 className="mb-3 text-sm font-bold text-foreground">Как подключиться</h2>
        <div className="space-y-2">
          {[
            {
              step: '1',
              title: 'Скопируйте VPN ключ',
              desc: 'Нажмите на карточку подписки выше',
              icon: Copy,
            },
            {
              step: '2',
              title: 'Откройте приложение',
              desc: 'V2RayNG, Happ, Streisand или другое',
              icon: Smartphone,
            },
            {
              step: '3',
              title: 'Добавьте конфигурацию',
              desc: 'Вставьте ключ из буфера обмена',
              icon: Globe,
            },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.step}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {item.step}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            )
          })}
        </div>
      </div>

      {/* Supported apps */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-2.5 text-xs font-semibold text-foreground">Поддерживаемые приложения</p>
        <div className="flex flex-wrap gap-2">
          {['V2RayNG', 'Happ', 'Streisand', 'V2Box', 'Nekoray', 'Shadowrocket'].map(
            (app) => (
              <span
                key={app}
                className="rounded-lg bg-secondary px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
              >
                {app}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  )
}
