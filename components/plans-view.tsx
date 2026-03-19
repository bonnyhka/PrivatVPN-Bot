'use client'

import { Check, Sparkles, Zap, Shield, Gem, ArrowRight, Users, Globe, Rocket } from 'lucide-react'
import { PLANS } from '@/lib/store'
import type { Plan, AppView } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PlansViewProps {
  onNavigate: (view: AppView) => void
  onSelectPlan: (plan: Plan) => void
}

const PLAN_THEMES: Record<string, { icon: typeof Sparkles; gradient: string; accent: string; glow: string }> = {
  scout: {
    icon: Sparkles,
    gradient: 'from-slate-500/20 to-slate-600/10',
    accent: 'text-slate-400',
    glow: '',
  },
  guardian: {
    icon: Shield,
    gradient: 'from-primary/30 to-cyan-500/20',
    accent: 'text-primary',
    glow: 'shadow-[0_0_40px_hsl(210_100%_55%/0.2)]',
  },
  fortress: {
    icon: Zap,
    gradient: 'from-violet-500/25 to-purple-600/15',
    accent: 'text-violet-400',
    glow: '',
  },
  citadel: {
    icon: Gem,
    gradient: 'from-amber-500/25 to-orange-500/15',
    accent: 'text-amber-400',
    glow: 'shadow-[0_0_30px_hsl(45_90%_55%/0.12)]',
  },
}

export function PlansView({ onNavigate, onSelectPlan }: PlansViewProps) {
  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
          <Rocket className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Выберите тариф</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Безлимитный VPN от 50 руб/мес
        </p>
      </div>

      {/* Promo banner */}
      <div className="mb-5 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-cyan-500/10 p-3.5">
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
      </div>

      {/* Plans */}
      <div className="space-y-4">
        {PLANS.map((plan) => {
          const theme = PLAN_THEMES[plan.id] || PLAN_THEMES.scout
          const Icon = theme.icon

          return (
            <div
              key={plan.id}
              className={cn(
                'relative overflow-hidden rounded-2xl border bg-card transition-all',
                plan.popular
                  ? 'border-primary/50 ' + theme.glow
                  : 'border-border hover:border-primary/30',
                theme.glow
              )}
            >
              {/* Gradient header */}
              <div className={cn('relative h-20 bg-gradient-to-br', theme.gradient)}>
                {/* Pattern overlay */}
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}
                />
                
                {/* Icon */}
                <div className="absolute left-5 top-1/2 -translate-y-1/2">
                  <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl bg-card/80 backdrop-blur-sm',
                    plan.popular && 'ring-2 ring-primary/50'
                  )}>
                    <Icon className={cn('h-6 w-6', theme.accent)} />
                  </div>
                </div>

                {/* Plan name & badge */}
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-right">
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  {plan.badge && (
                    <span className={cn(
                      'mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                      plan.popular
                        ? 'bg-primary text-primary-foreground'
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
                    <Globe className={cn('h-3.5 w-3.5', theme.accent)} />
                    <span className="text-xs text-foreground">
                      {plan.id === 'scout' ? '5' : plan.id === 'guardian' ? '12' : plan.id === 'fortress' ? '25+' : 'Все'} серверов
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
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="mt-6 text-center text-[10px] text-muted-foreground">
        Все тарифы включают: без рекламы, без логов, шифрование AES-256
      </p>
    </div>
  )
}
