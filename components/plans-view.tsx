'use client'

import { Check, Sparkles, Zap, Shield, Gem, ArrowRight, Users, Rocket, Database, Gift, Compass, ShieldCheck, Vault, Crown } from 'lucide-react'
import { useState } from 'react'
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
  icon: typeof Sparkles, 
  gradient: string, 
  accent: string, 
  glow: string,
  border: string,
  bg: string
}> = {
  scout: {
    icon: Compass,
    gradient: 'from-slate-500/20 to-slate-600/10',
    accent: 'text-slate-400',
    glow: 'shadow-[0_0_20px_rgba(148,163,184,0.1)]',
    border: 'border-slate-500/30',
    bg: 'bg-slate-500/5'
  },
  guardian: {
    icon: ShieldCheck,
    gradient: 'from-cyan-500/30 to-blue-600/20',
    accent: 'text-cyan-400',
    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.2)]',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500/5'
  },
  fortress: {
    icon: Vault,
    gradient: 'from-violet-500/30 to-purple-600/20',
    accent: 'text-violet-400',
    glow: 'shadow-[0_0_40px_rgba(139,92,246,0.25)]',
    border: 'border-violet-500/50',
    bg: 'bg-violet-500/5'
  },
  citadel: {
    icon: Crown,
    gradient: 'from-amber-500/30 to-orange-500/20',
    accent: 'text-amber-400',
    glow: 'shadow-[0_0_50px_rgba(245,158,11,0.3)]',
    border: 'border-amber-500/60',
    bg: 'bg-amber-500/5'
  },
}

export function PlansView({ user, plans, onNavigate, onSelectPlan, setIsGift }: PlansViewProps) {
  const [localIsGift, setLocalIsGift] = useState(false)

  const handleToggleGift = (val: boolean) => {
    setLocalIsGift(val)
    setIsGift(val)
  }

  return (
    <AnimatedContainer className="min-h-screen px-4 pb-24 pt-6">
      {/* Header */}
      <AnimatedItem className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
          <Rocket className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Выберите тариф</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          2 активные локации: Германия и Нидерланды
        </p>
      </AnimatedItem>


      {/* Promo banner */}
      <AnimatedItem className="mb-5 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-cyan-500/10 p-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Пригласи друга</p>
            <p className="text-[10px] text-muted-foreground">Получи 30 руб за каждого</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-primary" />
        </div>
      </AnimatedItem>

      {/* Plans */}
      <AnimatedItem className="-mx-4 mt-2 overflow-x-auto hide-scrollbar">
      <div className="flex snap-x snap-mandatory gap-4 px-6 pt-14 pb-12">
        {plans.map((plan: Plan) => {
          const theme = PLAN_THEMES[plan.id] || PLAN_THEMES.scout
          const Icon = theme.icon

          return (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-[2rem] border-2 transition-all duration-300 w-[calc(100%-40px)] shrink-0 snap-center md:w-[300px]',
                theme.border,
                theme.glow,
                theme.bg,
                plan.popular && 'scale-[1.02] z-10'
              )}
            >
              <div className="rounded-[calc(2rem-2px)]">
                {/* Gradient header */}
                <div className={cn('relative flex min-h-[5.5rem] items-center justify-between px-5 py-3 bg-gradient-to-br overflow-hidden rounded-[calc(2rem-2px)] rounded-b-none', theme.gradient)}>
                  {/* Pattern overlay */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  />

                  {/* Icon */}
                  <div className={cn(
                    'relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-card/80 backdrop-blur-sm',
                    plan.popular && 'ring-2 ring-primary/50'
                  )}>
                    <Icon className={cn('h-6 w-6', theme.accent)} />
                  </div>

                  {/* Plan details (stacked on right) */}
                  <div className="relative z-10 flex flex-col items-end gap-1 text-right">
                    {plan.popular && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                        Популярный
                      </span>
                    )}
                    <h3 className="text-xl font-bold text-white drop-shadow-md">{plan.name}</h3>
                    {plan.badge && (
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold leading-none',
                        plan.popular
                          ? 'bg-primary/90 text-primary-foreground'
                          : plan.id === 'citadel'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-violet-500/20 text-violet-400'
                      )}>
                        {plan.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                {/* Price */}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                  <span className="text-base text-muted-foreground">{'\u20BD'}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>

                {/* Quick stats */}
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Users className={cn('h-3.5 w-3.5', theme.accent)} />
                    <span className="text-xs text-foreground">
                      {plan.devicesCount} {plan.devicesCount === 1 ? 'устр.' : 'устр.'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className={cn('h-3.5 w-3.5', theme.accent)} />
                    <span className="text-xs text-foreground">{plan.speedLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Database className={cn('h-3.5 w-3.5', theme.accent)} />
                    <span className="text-xs text-foreground">
                      {plan.trafficLimit > 1000000000000
                        ? '∞'
                        : Math.floor(plan.trafficLimit / (1024 * 1024 * 1024)) + ' ГБ'} Трафик
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-4 h-px bg-border" />

                {/* Features */}
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <div className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                        plan.popular ? 'bg-primary/20' : 'bg-secondary'
                      )}>
                        <Check className={cn('h-2.5 w-2.5', plan.popular ? 'text-primary' : theme.accent)} />
                      </div>
                      <span className="text-sm text-secondary-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                  {(() => {
                    const isActive = user?.subscription?.status === 'active'
                    const activeIndex = isActive && user.subscription ? plans.findIndex(p => p.id === user.subscription!.planId) : -1
                    const thisIndex = plans.findIndex(p => p.id === plan.id)
                    const isDowngrade = isActive && activeIndex !== -1 && thisIndex < activeIndex

                    return (
                      <button
                        onClick={() => {
                          onSelectPlan(plan)
                          onNavigate('payment')
                        }}
                        className={cn(
                          'group mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all',
                          plan.popular
                            ? 'bg-primary text-primary-foreground hover:brightness-110'
                            : 'border border-border bg-secondary text-foreground hover:border-primary/40 hover:bg-primary/10'
                        )}
                      >
                        Подключить
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    )
                  })()}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      </AnimatedItem>

      {/* Footer note */}
      <AnimatedItem>
        <p className="mt-6 text-center text-[10px] text-muted-foreground">
          Все тарифы включают: без рекламы, без логов, шифрование AES-256
        </p>
      </AnimatedItem>
    </AnimatedContainer>
  )
}
