'use client'

import { useEffect, useMemo, useState } from 'react'
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
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
} from 'lucide-react'
import type { AppView, Plan, User } from '@/lib/types'
import { AnimatedContainer, AnimatedItem } from '@/components/ui/animated-view'
import { SubscriptionCard } from './subscription-card'
import { cn } from '@/lib/utils'

interface HomeViewProps {
  user: User
  plans: Plan[]
  onNavigate: (view: AppView) => void
}

type LocationItem = {
  id: string
  host?: string
  isActive?: boolean
  ping?: number
  checkedAt?: string
  healthStatus?: string
}

type UserStats = {
  activeDevices?: number
  totalTrafficAllTime?: number
  networkAvailabilityPercent?: number
  accountAgeDays?: number
}

function getHealthTone(status: 'stable' | 'attention' | 'degraded') {
  if (status === 'stable') {
    return {
      badge: 'border-emerald-500/25 bg-emerald-500/12 text-emerald-300',
      glow: 'from-emerald-500/18 via-emerald-400/7 to-transparent',
    }
  }

  if (status === 'attention') {
    return {
      badge: 'border-yellow-500/25 bg-yellow-500/12 text-yellow-300',
      glow: 'from-yellow-500/18 via-amber-400/7 to-transparent',
    }
  }

  return {
    badge: 'border-orange-500/25 bg-orange-500/12 text-orange-300',
    glow: 'from-orange-500/20 via-orange-400/8 to-transparent',
  }
}

export function HomeView({ user, plans, onNavigate }: HomeViewProps) {
  const [copied, setCopied] = useState(false)
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [showRedeem, setShowRedeem] = useState(false)

  useEffect(() => {
    fetch('/api/locations', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLocations(data)
        }
      })
      .catch(console.error)

    if (user.id && user.id !== 'opt') {
      fetch('/api/user/stats', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => setStats(data))
        .catch(console.error)
    }
  }, [user.id])

  const sub = user.subscription
  const plan = plans.find((p) => p.id === sub?.planId)
  const hasSubscription = sub?.status === 'active'
  const onlineLocations = locations.filter((loc) => Boolean(loc.isActive))
  const degradedLocations = locations.filter((loc) =>
    ['degraded', 'critical', 'offline'].includes(String(loc.healthStatus || ''))
  )
  const averagePing = useMemo(() => {
    const values = onlineLocations
      .map((loc) => Number(loc.ping || 0))
      .filter((value) => Number.isFinite(value) && value > 0)
    if (values.length === 0) return null
    return Math.round(values.reduce((acc, current) => acc + current, 0) / values.length)
  }, [onlineLocations])

  const diagnosticsFreshestMinutes = useMemo(() => {
    const values = locations
      .map((loc) => {
        if (!loc.checkedAt) return null
        const timestamp = new Date(loc.checkedAt).getTime()
        if (!Number.isFinite(timestamp)) return null
        return Math.max(0, (Date.now() - timestamp) / 60000)
      })
      .filter((value): value is number => typeof value === 'number')
      .sort((a, b) => a - b)
    return values[0] ?? null
  }, [locations])

  const telemetryFreshnessLabel =
    typeof diagnosticsFreshestMinutes === 'number'
      ? diagnosticsFreshestMinutes < 2
        ? 'только что'
        : `${Math.round(diagnosticsFreshestMinutes)} мин назад`
      : 'нет данных'

  const networkState: 'stable' | 'attention' | 'degraded' =
    degradedLocations.length === 0 ? 'stable' : degradedLocations.length > 1 ? 'degraded' : 'attention'
  const networkTone = getHealthTone(networkState)
  const availabilityPercent =
    typeof stats?.networkAvailabilityPercent === 'number'
      ? stats.networkAvailabilityPercent
      : locations.length > 0
        ? Number(((onlineLocations.length / locations.length) * 100).toFixed(1))
        : null

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
          <div className="grain-surface relative overflow-hidden rounded-[28px] border border-border/80 bg-card/95 p-5 shadow-[0_24px_70px_-50px_rgba(0,0,0,0.9)]">
            <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', networkTone.glow)} />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(120,130,255,0.14),transparent_48%)]" />
            <img
              src="/images/referral-hero.gif"
              alt=""
              className="pointer-events-none absolute -right-12 -top-10 h-[155%] w-[62%] rotate-[8deg] object-contain opacity-70"
            />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                    PrivatVPN
                  </p>
                  <h1 className="mt-2 text-[1.75rem] font-black leading-[1.03] tracking-[-0.045em] text-foreground">
                    Главная
                  </h1>
                  <p className="mt-2 max-w-[17rem] text-xs leading-5 text-muted-foreground">
                    Ключевые показатели сети и быстрые действия для подписки в одном месте.
                  </p>
                </div>

                <div className={cn('shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold', networkTone.badge)}>
                  {networkState === 'stable' ? 'Стабильно' : networkState === 'attention' ? 'Есть нюансы' : 'Нужен контроль'}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-border/80 bg-secondary/35 px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground">Узлы online</p>
                  <p className="mt-1 text-sm font-black text-foreground">
                    {onlineLocations.length}/{locations.length || 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-secondary/35 px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground">Средний ping</p>
                  <p className="mt-1 text-sm font-black text-foreground">{averagePing ? `${averagePing} мс` : '--'}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-secondary/35 px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground">Проверка</p>
                  <p className="mt-1 text-sm font-black text-foreground">{telemetryFreshnessLabel}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl border border-border/80 bg-secondary/25 px-3 py-2.5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-[11px]">Доступность сети</span>
                </div>
                <p className="text-xs font-bold text-foreground">{availabilityPercent ?? '--'}%</p>
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
