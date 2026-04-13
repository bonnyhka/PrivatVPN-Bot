'use client'

import { Check, ArrowRight, Sparkles, Compass, ShieldCheck, Vault, Crown, Gift } from 'lucide-react'
import type { AppView, Plan, User } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AnimatedContainer, AnimatedItem } from '@/components/ui/animated-view'

interface PlansViewProps {
  user: User
  plans: Plan[]
  onNavigate: (view: AppView) => void
  onSelectPlan: (plan: Plan) => void
  setIsGift: (isGift: boolean) => void
}

const PLAN_THEMES: Record<string, {
  icon: typeof Sparkles
  accent: string
  border: string
  softBg: string
  iconBg: string
  glow: string
  banner: string
}> = {
  scout: {
    icon: Compass,
    accent: 'text-slate-300',
    border: 'border-slate-500/25',
    softBg: 'from-slate-500/10 via-slate-500/5 to-transparent',
    iconBg: 'bg-slate-500/10',
    glow: 'shadow-[0_18px_50px_rgba(71,85,105,0.10)]',
    banner: 'from-slate-500/18 via-slate-400/10 to-slate-900/10',
  },
  guardian: {
    icon: ShieldCheck,
    accent: 'text-cyan-300',
    border: 'border-cyan-500/30',
    softBg: 'from-cyan-500/12 via-blue-500/6 to-transparent',
    iconBg: 'bg-cyan-500/10',
    glow: 'shadow-[0_20px_55px_rgba(8,145,178,0.12)]',
    banner: 'from-cyan-500/18 via-blue-500/14 to-slate-950/12',
  },
  fortress: {
    icon: Vault,
    accent: 'text-violet-300',
    border: 'border-violet-500/30',
    softBg: 'from-violet-500/12 via-fuchsia-500/6 to-transparent',
    iconBg: 'bg-violet-500/10',
    glow: 'shadow-[0_22px_60px_rgba(139,92,246,0.12)]',
    banner: 'from-violet-500/18 via-fuchsia-500/12 to-slate-950/12',
  },
  citadel: {
    icon: Crown,
    accent: 'text-amber-300',
    border: 'border-amber-500/35',
    softBg: 'from-amber-500/14 via-orange-500/7 to-transparent',
    iconBg: 'bg-amber-500/10',
    glow: 'shadow-[0_24px_65px_rgba(245,158,11,0.14)]',
    banner: 'from-amber-500/18 via-orange-500/12 to-slate-950/12',
  },
}

function formatTraffic(limit: number) {
  if (!Number.isFinite(limit) || limit > 1_000_000_000_000) {
    return 'Безлимит'
  }

  return `${Math.floor(limit / (1024 * 1024 * 1024))} ГБ`
}

function getPlanButtonLabel(options: {
  isCurrentPlan: boolean
  isDowngrade: boolean
  isUpgrade: boolean
}) {
  if (options.isCurrentPlan) return 'Подключено'
  if (options.isDowngrade) return 'Понижение недоступно'
  if (options.isUpgrade) return 'Улучшить тариф'
  return 'Выбрать тариф'
}

export function PlansView({ user, plans, onNavigate, onSelectPlan, setIsGift }: PlansViewProps) {
  const activePlanIndex =
    user?.subscription?.status === 'active'
      ? plans.findIndex((plan) => plan.id === user.subscription?.planId)
      : -1

  return (
    <AnimatedContainer className="app-screen-shell min-h-screen px-4 pb-24 pt-6">
      <div className="mx-auto w-full max-w-md">
        <AnimatedItem className="mb-7 text-center">
          <div className="mx-auto h-[4.75rem] w-[4.75rem]">
            <img
              src="/images/plans-header.gif"
              alt="PrivatVPN"
              className="h-full w-full object-contain"
              loading="eager"
              draggable={false}
            />
          </div>

          <h1 className="mt-4 text-[2rem] font-black leading-[1.02] tracking-[-0.045em] text-foreground">
            Подберите тариф
          </h1>

          <p className="mx-auto mt-2 max-w-[20rem] text-sm leading-6 text-muted-foreground">
            Выберите подходящий уровень доступа и оформите подписку для себя или в подарок.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-card/70 px-3 py-1.5 text-[11px] font-medium text-foreground">
              Без логов
            </span>
            <span className="rounded-full bg-card/70 px-3 py-1.5 text-[11px] font-medium text-foreground">
              Защищённый трафик
            </span>
            <span className="rounded-full bg-card/70 px-3 py-1.5 text-[11px] font-medium text-foreground">
              Без рекламы
            </span>
          </div>
        </AnimatedItem>

        <div className="space-y-4">
          {plans.map((plan) => {
            const theme = PLAN_THEMES[plan.id] || PLAN_THEMES.scout
            const Icon = theme.icon

            const thisPlanIndex = plans.findIndex((item) => item.id === plan.id)
            const isCurrentPlan = user?.subscription?.status === 'active' && user.subscription?.planId === plan.id
            const isDowngrade = activePlanIndex !== -1 && thisPlanIndex < activePlanIndex
            const isUpgrade = activePlanIndex !== -1 && thisPlanIndex > activePlanIndex
            const buttonLabel = getPlanButtonLabel({ isCurrentPlan, isDowngrade, isUpgrade })
            const buttonDisabled = isCurrentPlan || isDowngrade

            return (
              <AnimatedItem key={plan.id}>
                <div
                  className={cn(
                    'relative overflow-hidden rounded-[1.75rem] border bg-card/95 p-5 backdrop-blur-sm',
                    theme.border,
                    theme.glow,
                  )}
                >
                  <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', theme.softBg)} />

                  <div className="relative">
                    <div className={cn('relative overflow-hidden rounded-[1.45rem] border border-white/8 bg-gradient-to-br p-4', theme.banner)}>
                      <div
                        className="pointer-events-none absolute inset-0 opacity-35"
                        style={{
                          backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.12'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                        }}
                      />

                      <div className="relative flex min-h-[5.75rem] items-center justify-between gap-4">
                        <div className="min-w-0 flex items-center gap-3.5">
                          <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm', theme.iconBg)}>
                            <Icon className={cn('h-6 w-6', theme.accent)} />
                          </div>

                          <div className="min-w-0">
                            <h2 className="text-[1.55rem] font-black leading-none tracking-[-0.04em] text-foreground">
                              {plan.name}
                            </h2>
                          </div>
                        </div>

                        <div className="shrink-0 self-center text-right">
                          <div className="flex items-end justify-end gap-1.5">
                            <span className="text-[2.3rem] font-black leading-none tracking-[-0.07em] text-foreground">
                              {plan.price}
                            </span>
                            <span className="pb-1 text-base font-medium text-foreground/80">
                              ₽
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/65">
                            за месяц
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2.5">
                      <div className="rounded-2xl border border-border/80 bg-secondary/35 px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Устройства
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {plan.devicesCount}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/80 bg-secondary/35 px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Скорость
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {plan.speedLabel}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/80 bg-secondary/35 px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Трафик
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {formatTraffic(plan.trafficLimit)}
                        </p>
                      </div>
                    </div>

                    <ul className="mt-4 space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-[13px] leading-5 text-secondary-foreground">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          if (buttonDisabled) return
                          setIsGift(false)
                          onSelectPlan(plan)
                          onNavigate('payment')
                        }}
                        disabled={buttonDisabled}
                        className={cn(
                          'group flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all',
                          buttonDisabled
                            ? 'cursor-not-allowed border border-border bg-secondary/60 text-muted-foreground'
                            : plan.popular
                              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110'
                              : 'border border-border bg-secondary text-foreground hover:border-primary/35 hover:bg-primary/10'
                        )}
                      >
                        {buttonLabel}
                        {!buttonDisabled && (
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setIsGift(true)
                          onSelectPlan(plan)
                          onNavigate('payment')
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card/70 py-3.5 text-sm font-semibold text-foreground transition-all hover:border-primary/25 hover:bg-secondary"
                      >
                        <Gift className="h-4 w-4 text-primary" />
                        В подарок
                      </button>
                    </div>
                  </div>
                </div>
              </AnimatedItem>
            )
          })}
        </div>
      </div>
    </AnimatedContainer>
  )
}
