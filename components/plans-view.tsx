'use client'

import { Check, Sparkles, Zap, Crown, Rocket } from 'lucide-react'
import { PLANS } from '@/lib/store'
import type { Plan, AppView } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PlansViewProps {
  onNavigate: (view: AppView) => void
  onSelectPlan: (plan: Plan) => void
}

const PLAN_ICONS: Record<string, typeof Sparkles> = {
  lite: Sparkles,
  standard: Zap,
  pro: Crown,
  annual: Rocket,
}

export function PlansView({ onNavigate, onSelectPlan }: PlansViewProps) {
  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <div className="mb-2 text-center">
        <h1 className="text-xl font-bold text-foreground">Тарифные планы</h1>
        <p className="mt-1 text-sm text-muted-foreground">Выберите подходящий тариф</p>
      </div>

      <div className="mt-6 space-y-4">
        {PLANS.map((plan) => {
          const Icon = PLAN_ICONS[plan.id] || Sparkles
          return (
            <div
              key={plan.id}
              className={cn(
                'relative overflow-hidden rounded-2xl border bg-card p-5 transition-all',
                plan.popular
                  ? 'border-primary/60 glow-green'
                  : 'border-border hover:border-primary/30'
              )}
            >
              {plan.badge && (
                <span className={cn(
                  'absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                  plan.popular
                    ? 'bg-primary text-primary-foreground'
                    : plan.discount
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-secondary text-muted-foreground'
                )}>
                  {plan.badge}
                </span>
              )}

              <div className="flex items-start gap-4">
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  plan.popular ? 'bg-primary/15' : 'bg-secondary'
                )}>
                  <Icon className={cn(
                    'h-5 w-5',
                    plan.popular ? 'text-primary' : 'text-muted-foreground'
                  )} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{'\u20BD'} {plan.period}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{plan.devicesCount} {plan.devicesCount === 1 ? 'устройство' : plan.devicesCount < 5 ? 'устройства' : 'устройств'}</span>
                    <span className="text-border">|</span>
                    <span>{plan.speedLabel}</span>
                  </div>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      plan.popular ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className="text-sm text-secondary-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  onSelectPlan(plan)
                  onNavigate('payment')
                }}
                className={cn(
                  'mt-4 w-full rounded-xl py-3 text-sm font-semibold transition-all',
                  plan.popular
                    ? 'bg-primary text-primary-foreground hover:brightness-110'
                    : 'border border-border bg-secondary text-foreground hover:border-primary/40 hover:bg-primary/10'
                )}
              >
                Подключить
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
