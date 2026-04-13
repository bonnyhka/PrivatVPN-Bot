'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  CreditCard,
  FileText,
  Globe,
  HardDrive,
  Loader2,
  MessageCircle,
  Smartphone,
  Sparkles,
  Star,
} from 'lucide-react'
import type { AppView, Plan, User } from '@/lib/types'
import { AnimatedContainer, AnimatedItem } from '@/components/ui/animated-view'
import { SubscriptionCard } from './subscription-card'

interface HomeViewProps {
  user: User
  plans: Plan[]
  onNavigate: (view: AppView) => void
}



function getGreeting(): { greeting: string; message: string } {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) {
    return { greeting: 'Доброе утро', message: 'Отличное время для продуктивной работы!' }
  }
  if (hour >= 12 && hour < 18) {
    return { greeting: 'Добрый день', message: 'Рады снова вас видеть!' }
  }
  if (hour >= 18 && hour < 23) {
    return { greeting: 'Добрый вечер', message: 'Приятного времяпровождения в сети!' }
  }
  return { greeting: 'Доброй ночи', message: 'Не забудьте отдохнуть!' }
}

export function HomeView({ user, plans, onNavigate }: HomeViewProps) {
  const [copied, setCopied] = useState(false)
  const [showRedeem, setShowRedeem] = useState(false)

  const sub = user.subscription
  const plan = plans.find((p) => p.id === sub?.planId)
  const hasSubscription = sub?.status === 'active'

  const handleCopyKey = () => {
    if (sub?.subscriptionUrl) {
      navigator.clipboard.writeText(sub.subscriptionUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <AnimatedContainer className="app-screen-shell min-h-screen px-4 pb-24 pt-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <AnimatedItem>
          <div className="grain-surface relative overflow-hidden rounded-[26px] border border-border/80 bg-card/95 p-5 shadow-[0_24px_60px_-45px_rgba(0,0,0,0.85)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(120,130,255,0.09),transparent_48%)]" />
            <img
              src="/images/referral-hero.gif"
              alt=""
              className="pointer-events-none absolute -right-10 top-0 h-full w-[56%] rotate-[8deg] object-contain opacity-60"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-[66%]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                    PrivatVPN
                  </p>
                  <h1 className="mt-2 text-lg font-bold text-foreground">{getGreeting().greeting}</h1>
                  <p className="mt-1 text-xs text-muted-foreground">{getGreeting().message}</p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedItem>

        <AnimatedItem>
          {hasSubscription ? (
            <SubscriptionCard plan={plan} subscription={sub} copied={copied} onCopy={handleCopyKey} />
          ) : (
            <div className="grain-surface overflow-hidden rounded-[26px] border border-border/80 bg-card/95 p-5 shadow-[0_20px_60px_-44px_rgba(0,0,0,0.9)]">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-black text-foreground">Подписка не активирована</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Выберите тариф и подключите VPN за пару минут.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => onNavigate('plans')}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
                >
                  Выбрать тариф
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowRedeem((prev) => !prev)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-secondary/60"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  Ввести код
                </button>
              </div>

              <AnimatePresence>
                {showRedeem && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 overflow-hidden rounded-2xl border border-border/80 bg-secondary/25 p-3"
                  >
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Активация подарочного кода
                    </p>
                    <RedeemCodeForm onRedeem={() => onNavigate('home')} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </AnimatedItem>

        <AnimatedItem className="grid grid-cols-2 gap-2.5">
          <QuickActionCard
            title="Мой VPN"
            subtitle="Ключ и подключение"
            icon={Smartphone}
            onClick={() => onNavigate('my-vpn')}
          />
          <QuickActionCard
            title="Тарифы"
            subtitle="от 99 руб/мес"
            icon={Star}
            onClick={() => onNavigate('plans')}
          />
          <QuickActionCard
            title="Поддержка"
            subtitle="Ответы 24/7"
            icon={MessageCircle}
            onClick={() => onNavigate('support')}
          />
          <QuickActionCard
            title="Статус"
            subtitle="Состояние сервисов"
            icon={Activity}
            onClick={() => onNavigate('service-status')}
          />
        </AnimatedItem>

        {(user.role === 'admin' || user.role === 'owner') && (
          <AnimatedItem>
            <button
              onClick={() => onNavigate('market')}
              className="group grain-surface relative flex w-full items-center gap-4 overflow-hidden rounded-[24px] border border-primary/20 bg-gradient-to-br from-primary/12 via-primary/7 to-transparent p-4 transition-all hover:border-primary/35"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <HardDrive className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-black uppercase tracking-[0.04em] text-foreground">VPN Роутеры</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Готовое решение для дома и офиса: включили и сеть под защитой.
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-primary">
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          </AnimatedItem>
        )}

        <AnimatedItem className="pb-6">
          <button
            onClick={() => onNavigate('documents')}
            className="grain-surface flex w-full items-center justify-between rounded-2xl border border-border/80 bg-card/95 p-4 transition-all hover:border-primary/30"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/60 text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Документы и оферта</p>
                <p className="text-[11px] text-muted-foreground">Актуальные правовые документы сервиса</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </AnimatedItem>
      </div>
    </AnimatedContainer>
  )
}

function QuickActionCard({
  title,
  subtitle,
  icon: Icon,
  onClick,
}: {
  title: string
  subtitle: string
  icon: typeof Globe
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group grain-surface rounded-2xl border border-border/80 bg-card/95 p-3.5 text-left transition-all hover:border-primary/30 hover:bg-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
          <Icon className="h-4 w-4" />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>
    </button>
  )
}

function RedeemCodeForm({ onRedeem }: { onRedeem: () => void }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleRedeem = async () => {
    if (!code) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/user/gift/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        setCode('')
        setTimeout(() => setSuccess(false), 3000)
        onRedeem()
      } else {
        setError(data.error || 'Ошибка')
      }
    } catch {
      setError('Ошибка сети')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="PVPN-XXXX-XXXX"
          className="flex-1 rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-xs text-foreground transition-all focus:border-primary focus:outline-none"
        />
        <button
          onClick={handleRedeem}
          disabled={loading || !code}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : success ? (
            <Check className="h-4 w-4" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </div>
      {error && <p className="text-[10px] font-medium text-destructive">{error}</p>}
      {success && <p className="text-[10px] font-medium text-emerald-400">Код принят!</p>}
    </div>
  )
}
