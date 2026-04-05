'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Copy, Check, Globe, Gift, Users, ChevronRight, Smartphone, Zap, Clock, CreditCard, Wifi, Star, ArrowRight, FileText, HardDrive, Loader2, Sparkles, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User, AppView, Plan } from '@/lib/types'
import { AnimatedContainer, AnimatedItem } from '@/components/ui/animated-view'

interface HomeViewProps {
  user: User
  plans: Plan[]
  onNavigate: (view: AppView) => void
}

function formatTraffic(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getHealthBadge(status?: string) {
  switch (status) {
    case 'stable':
      return 'bg-green-500/12 text-green-400 border-green-500/20'
    case 'attention':
      return 'bg-yellow-500/12 text-yellow-400 border-yellow-500/20'
    case 'degraded':
      return 'bg-orange-500/12 text-orange-400 border-orange-500/20'
    case 'critical':
    case 'offline':
      return 'bg-red-500/12 text-red-400 border-red-500/20'
    default:
      return 'bg-secondary text-muted-foreground border-border'
  }
}

function getHealthBar(status?: string) {
  switch (status) {
    case 'stable':
      return 'bg-gradient-to-r from-green-400 to-emerald-500'
    case 'attention':
      return 'bg-gradient-to-r from-yellow-400 to-amber-500'
    case 'degraded':
      return 'bg-gradient-to-r from-orange-400 to-orange-500'
    case 'critical':
    case 'offline':
      return 'bg-gradient-to-r from-red-500 to-rose-500'
    default:
      return 'bg-primary'
  }
}

function getHealthTone(status?: string) {
  switch (status) {
    case 'stable':
      return {
        shell: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
        soft: 'bg-emerald-500/12',
        glow: 'from-emerald-500/16 via-emerald-400/6 to-transparent',
      }
    case 'attention':
      return {
        shell: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300',
        soft: 'bg-yellow-500/12',
        glow: 'from-yellow-500/16 via-amber-400/6 to-transparent',
      }
    case 'degraded':
      return {
        shell: 'border-orange-500/20 bg-orange-500/10 text-orange-300',
        soft: 'bg-orange-500/12',
        glow: 'from-orange-500/16 via-orange-400/6 to-transparent',
      }
    case 'critical':
    case 'offline':
      return {
        shell: 'border-red-500/20 bg-red-500/10 text-red-300',
        soft: 'bg-red-500/12',
        glow: 'from-red-500/16 via-rose-400/6 to-transparent',
      }
    default:
      return {
        shell: 'border-border bg-secondary/50 text-muted-foreground',
        soft: 'bg-secondary/30',
        glow: 'from-primary/10 via-transparent to-transparent',
      }
  }
}

export function HomeView({ user, plans, onNavigate }: HomeViewProps) {
  const [copied, setCopied] = useState(false)
  const [locations, setLocations] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [showRedeem, setShowRedeem] = useState(false)

  useEffect(() => {
    fetch('/api/locations', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLocations(data)
          if (user.id && user.id !== 'opt') {
            data.forEach(loc => {
              if (!loc.host) return
              const start = Date.now()
              fetch(`https://${loc.host}`, { mode: 'no-cors' })
                .then(() => {
                  const latency = Date.now() - start
                  fetch('/api/stats/ping', {
                    method: 'POST',
                    body: JSON.stringify({
                      locationId: loc.id,
                      latency
                    })
                  }).catch(() => { })
                })
                .catch(() => { })
            })
          }
        }
      })
      .catch(console.error)

    if (user.id && user.id !== 'opt') {
      fetch('/api/user/stats')
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(console.error)
    }
  }, [user.id])

  const sub = user.subscription
  const plan = plans.find((p: Plan) => p.id === sub?.planId)
  const hasSubscription = sub?.status === 'active'
  const referralCount = user.referralsCount || 0
  const sortedLocations = [...locations].sort((a, b) => {
    const scoreDiff = (b.healthScore || 0) - (a.healthScore || 0)
    if (scoreDiff !== 0) return scoreDiff
    const pingDiff = (a.ping || 999) - (b.ping || 999)
    if (pingDiff !== 0) return pingDiff
    return (a.load || 0) - (b.load || 0)
  })
  const recommendedLocation = sortedLocations.find((loc) => loc.isActive)
  const onlineLocations = locations.filter((loc) => loc.isActive)
  const degradedLocations = locations.filter((loc) => ['degraded', 'critical', 'offline'].includes(loc.healthStatus))
  const diagnosticsFreshestMinutes = locations
    .map((loc) => {
      if (!loc.checkedAt) return null
      const timestamp = new Date(loc.checkedAt).getTime()
      if (!Number.isFinite(timestamp)) return null
      return Math.max(0, (Date.now() - timestamp) / 60000)
    })
    .filter((value: number | null) => typeof value === 'number')
    .sort((a: number, b: number) => a - b)[0]
  const telemetryFreshnessLabel = typeof diagnosticsFreshestMinutes === 'number'
    ? diagnosticsFreshestMinutes < 2
      ? 'только что'
      : `${Math.round(diagnosticsFreshestMinutes)} мин назад`
    : 'нет данных'
  const networkState = degradedLocations.length === 0 ? 'stable' : degradedLocations.length > 1 ? 'degraded' : 'attention'
  const networkTone = getHealthTone(networkState)

  const daysLeft = sub?.expiresAt
    ? Math.ceil(
      (new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    : 0

  const handleCopyKey = () => {
    if (sub?.subscriptionUrl) {
      navigator.clipboard.writeText(sub.subscriptionUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <AnimatedContainer className="flex min-h-screen flex-col px-4 pb-24 pt-0">
      {/* Subscription Card -- bank card style */}
      <AnimatedItem>
        {hasSubscription ? (
          <div id="sub-card" className="sub-card relative mb-5 overflow-hidden rounded-2xl p-[1px]">
            <div className="sub-card-inner relative overflow-hidden rounded-2xl bg-card p-5">
              <div className="sub-card-shimmer pointer-events-none absolute inset-0 rounded-2xl opacity-[0.07]" />

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

              <div className="relative mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Подписка для приложений
                  </p>
                  <p className="text-[10px] font-bold text-primary/80">
                    {formatTraffic(Number(sub?.trafficUsed || 0))} / {plan?.trafficLimit && Number(plan.trafficLimit) > 999 * 1024 * 1024 * 1024 * 1024 ? '∞' : formatTraffic(Number(plan?.trafficLimit || 0))}
                  </p>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 truncate font-mono text-xs tracking-wide text-foreground/80">
                    {sub?.subscriptionUrl || 'https://sub.example.com/...'}
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
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-1000"
                    style={{
                      width: `${plan?.trafficLimit && plan.trafficLimit > 1000 * 1024 * 1024 * 1024 * 1024 ? 0 : Math.min((Number(sub?.trafficUsed || 0) / (plan?.trafficLimit || 10737418240)) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>

              <div className="relative mt-5 flex items-end justify-between">
                <div className="flex gap-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">До</p>
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
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Устройства</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      {plan?.devicesCount || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Скорость</p>
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
          <div className="mb-5 overflow-hidden rounded-2xl border border-dashed border-border bg-card transition-all hover:border-primary/40">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                <CreditCard className="h-6 w-6 text-muted-foreground transition-colors" />
              </div>
              <p className="mt-3 text-sm font-bold text-foreground">Нет активной подписки</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Подключите тариф от 99 руб/мес
              </p>
              
              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  onClick={() => onNavigate('plans')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-95"
                >
                  Выбрать тариф
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                
                <button
                  onClick={() => setShowRedeem(!showRedeem)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-5 py-2.5 text-xs font-semibold text-foreground transition-all hover:bg-secondary active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Ввести подарочный код
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showRedeem && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-dashed border-border bg-primary/5 px-6 pb-6 pt-4"
                >
                  <div className="rounded-xl border border-primary/20 bg-card p-3">
                    <p className="mb-2.5 text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Введите ваш код в рамке ниже:</p>
                    <RedeemCodeForm onRedeem={() => onNavigate('home')} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatedItem>

      <AnimatedItem className="mb-5 grid grid-cols-2 gap-3">
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
            <p className="text-[10px] text-muted-foreground">от 99 руб/мес</p>
          </div>
        </button>
      </AnimatedItem>

      <AnimatedItem>
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
      </AnimatedItem>

      {(user.role === 'admin' || user.role === 'owner') && (
        <AnimatedItem>
          <button
            onClick={() => onNavigate('market')}
            className="group mb-5 flex w-full items-center gap-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/20 p-5 transition-all hover:scale-[1.01] hover:border-primary/40 active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform">
              <HardDrive className="h-6 w-6" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-1.5 font-black text-white text-sm uppercase tracking-tight">
                VPN Роутеры
                <span className="rounded bg-primary/20 px-1 py-0.5 text-[8px] font-bold text-primary">NEW</span>
              </div>
              <p className="mt-0.5 text-[10px] leading-relaxed text-white/50 text-left">
                Готовое решение для дома. Включаешь — и весь Wi-Fi уже под защитой.
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </AnimatedItem>
      )}

      <AnimatedItem className="relative mb-5 overflow-hidden rounded-[28px] border border-emerald-500/15 bg-card p-4 shadow-[0_24px_60px_-40px_rgba(16,185,129,0.28)]">
        <div className={cn('pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.012),transparent)]', networkTone.glow)} />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/12">
              <Clock className="h-5 w-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-foreground">Аптайм серверов</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">Надёжность сети</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <p className="text-3xl font-black tracking-tight text-white">
              {stats?.uptimePercent ? `${stats.uptimePercent}%` : '99.9%'}
            </p>
            <div className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold', networkTone.shell)}>
              {degradedLocations.length === 0 ? 'Сеть стабильна' : 'Нужно внимание'}
            </div>
          </div>
        </div>
        <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-emerald-500/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,0.75),rgba(52,211,153,1),rgba(110,231,183,0.9))]"
            style={{ width: `${Math.max(12, Number(stats?.uptimePercent || 99.9))}%` }}
          />
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-[18px] border border-white/5 bg-secondary/35 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-[9px] uppercase tracking-[0.2em]">Онлайн</span>
            </div>
            <p className="mt-1 text-base font-black text-foreground">{onlineLocations.length}/{locations.length}</p>
          </div>
          <div className="rounded-[18px] border border-white/5 bg-secondary/35 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <RefreshCw className="h-3 w-3 text-primary" />
              <span className="text-[9px] uppercase tracking-[0.2em]">Проверка</span>
            </div>
            <p className="mt-1 text-[11px] font-black uppercase text-foreground">{telemetryFreshnessLabel}</p>
          </div>
          <div className="rounded-[18px] border border-white/5 bg-secondary/35 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <AlertTriangle className="h-3 w-3 text-primary" />
              <span className="text-[9px] uppercase tracking-[0.2em]">Проблем</span>
            </div>
            <div className="mt-1 flex items-center justify-center gap-1">
              <p className="text-base font-black text-foreground">{degradedLocations.length}</p>
              <span className={cn('rounded-full border px-1.5 py-0.5 text-[8px] font-semibold', degradedLocations.length === 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-orange-500/20 bg-orange-500/10 text-orange-300')}>
                {degradedLocations.length === 0 ? 'ок' : '!'}
              </span>
            </div>
          </div>
        </div>

        <div className="relative mt-4">
          <div className="overflow-hidden rounded-[22px] border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-3">
            <div className="rounded-[18px] border border-white/5 bg-secondary/35 p-3.5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Рекомендуем</p>
              {recommendedLocation ? (
                <>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-secondary/60">
                      {recommendedLocation.flag && recommendedLocation.flag.length === 2 ? (
                        <img
                          src={`https://flagcdn.com/${recommendedLocation.flag.toLowerCase()}.svg`}
                          alt={recommendedLocation.country}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-foreground">{recommendedLocation.flag || '--'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-black leading-none text-foreground">{recommendedLocation.name}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{recommendedLocation.country}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold', getHealthBadge(recommendedLocation.healthStatus))}>
                      {recommendedLocation.healthLabel}
                    </span>
                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-foreground">
                      {recommendedLocation.ping} мс
                    </span>
                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-foreground">
                      нагрузка {recommendedLocation.load}%
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={cn('h-full rounded-full transition-all', getHealthBar(recommendedLocation.healthStatus || networkState))}
                      style={{ width: `${Math.max(12, recommendedLocation.healthScore || 0)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">Лучший доступный узел по текущему состоянию сети.</p>
                </>
              ) : (
                <div className="mt-3">
                  <p className="text-base font-black text-foreground">Нет доступной локации</p>
                  <p className="mt-1 text-xs text-muted-foreground">Подождите следующую проверку.</p>
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-white/5 bg-secondary/30 p-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Проблемы</p>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <p className="text-2xl font-black text-foreground">{degradedLocations.length}</p>
                  <span className={cn('rounded-full border px-2 py-1 text-[10px] font-semibold', degradedLocations.length === 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-orange-500/20 bg-orange-500/10 text-orange-300')}>
                    {degradedLocations.length === 0 ? 'норма' : 'наблюдаем'}
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                  {degradedLocations.length === 0 ? 'Критичных сигналов нет.' : `Под наблюдением: ${degradedLocations.map((loc) => loc.name).join(', ')}`}
                </p>
              </div>
              <div className="rounded-[18px] border border-white/5 bg-secondary/30 p-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Картина сети</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-2xl font-black text-foreground">{locations.length}</span>
                  <span className="pb-1 text-[11px] text-muted-foreground">локации</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={cn('h-full rounded-full transition-all', getHealthBar(networkState))}
                    style={{ width: `${Math.max(12, degradedLocations.length === 0 ? 100 : Math.max(45, 100 - degradedLocations.length * 28))}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {degradedLocations.length === 0 ? 'Сеть выглядит здоровой.' : 'Есть сигналы для наблюдения.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {degradedLocations.length > 0 ? (
          <div className="relative mt-3 flex items-start gap-2 overflow-hidden rounded-[18px] border border-orange-500/20 bg-orange-500/8 p-3">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-full bg-orange-400/80" />
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
            <div>
              <p className="text-xs font-semibold text-foreground">Внимание: {degradedLocations.map((loc) => loc.name).join(', ')}</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                Если локация ведёт себя плохо, выберите рекомендованную выше.
              </p>
            </div>
          </div>
        ) : null}

        <div className="relative my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/5" />
          <div className="flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground/50">Все локации</span>
          </div>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        {locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 py-8 text-center">
            <Globe className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs font-medium text-muted-foreground">Сервера ещё не добавлены</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground/60">Скоро появятся новые локации</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedLocations.slice(0, 6).map((loc) => (
              <div
                key={loc.id}
                className="rounded-2xl border border-white/5 bg-secondary/30 p-3.5 transition-colors hover:border-primary/20 hover:bg-secondary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-secondary/50 ring-1 ring-white/8">
                      {loc.flag && loc.flag.length === 2 ? (
                        <img src={`https://flagcdn.com/${loc.flag.toLowerCase()}.svg`} alt={loc.country} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm">{loc.flag}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{loc.name || loc.country}</p>
                        <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-semibold', getHealthBadge(loc.healthStatus))}>{loc.healthLabel}</span>
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{loc.healthSummary}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-foreground">{loc.isActive ? `${loc.ping} мс` : '--'}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{loc.freshnessLabel}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/8 bg-secondary/35 px-2.5 py-1 text-[10px] text-foreground">Нагрузка {loc.load}% · {loc.capacityLabel}</span>
                  <span className="rounded-full border border-white/8 bg-secondary/35 px-2.5 py-1 text-[10px] text-foreground">Проверка {loc.freshnessLabel}</span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className={cn('h-full rounded-full transition-all', getHealthBar(loc.healthStatus))}
                    style={{ width: `${Math.max(6, loc.healthScore || 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </AnimatedItem>

      <AnimatedItem className="mt-6 pb-6">
        <button
          onClick={() => onNavigate('documents')}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Правовые документы и оферта</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </AnimatedItem>

    </AnimatedContainer>
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
        body: JSON.stringify({ code })
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
    } catch (e) {
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
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="PVPN-XXXX-XXXX"
          className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none transition-all"
        />
        <button
          onClick={handleRedeem}
          disabled={loading || !code}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-all hover:brightness-110 disabled:opacity-50"
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
      {error && <p className="text-[9px] font-medium text-destructive">{error}</p>}
      {success && <p className="text-[9px] font-medium text-green-500">Код принят!</p>}
    </div>
  )
}
