'use client'

import { useState } from 'react'
import {
  ArrowLeft, DollarSign, Save, RotateCcw, Smartphone, Zap,
  Shield, Crown, Check, AlertTriangle, TrendingUp, Edit3,
  Plus, Trash2, Package
} from 'lucide-react'
import type { AppView, Plan } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AdminPricingViewProps {
  plans: Plan[]
  setPlans: React.Dispatch<React.SetStateAction<Plan[]>>
  onNavigate: (view: AppView) => void
}

interface EditablePlan extends Plan {
  isEditing: boolean
  newPrice: number
  newFeatures: string[]
}

export function AdminPricingView({ plans: initialPlans, setPlans: setGlobalPlans, onNavigate }: AdminPricingViewProps) {
  const [plans, setPlans] = useState<EditablePlan[]>(
    initialPlans.map(p => ({ ...p, isEditing: false, newPrice: p.price, newFeatures: [...p.features] }))
  )
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const planIcons: Record<string, typeof Shield> = {
    scout: Shield,
    guardian: Zap,
    fortress: Crown,
    citadel: Crown,
  }

  const planColors: Record<string, { bg: string; text: string; border: string }> = {
    scout: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
    guardian: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
    fortress: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
    citadel: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  }

  function handlePriceChange(planId: string, newPrice: number) {
    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, newPrice: Math.max(0, newPrice) } : p
    ))
    setHasChanges(true)
    setSaved(false)
  }

  function handleFeatureChange(planId: string, index: number, newValue: string) {
    setPlans(prev => prev.map(p =>
      p.id === planId ? {
        ...p,
        newFeatures: p.newFeatures.map((f, i) => i === index ? newValue : f)
      } : p
    ))
    setHasChanges(true)
    setSaved(false)
  }

  function handleAddFeature(planId: string) {
    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, newFeatures: [...p.newFeatures, 'Новая функция'] } : p
    ))
    setHasChanges(true)
    setSaved(false)
  }

  function handleRemoveFeature(planId: string, index: number) {
    setPlans(prev => prev.map(p =>
      p.id === planId ? {
        ...p,
        newFeatures: p.newFeatures.filter((_, i) => i !== index)
      } : p
    ))
    setHasChanges(true)
    setSaved(false)
  }

  function toggleEditing(planId: string) {
    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, isEditing: !p.isEditing } : p
    ))
  }

  function handleReset() {
    setPlans(initialPlans.map(p => ({ ...p, isEditing: false, newPrice: p.price, newFeatures: [...p.features] })))
    setHasChanges(false)
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    for (const p of plans) {
      if (p.newPrice !== p.price || JSON.stringify(p.newFeatures) !== JSON.stringify(p.features)) {
        await fetch('/api/admin/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: p.id, price: p.newPrice, features: p.newFeatures, trafficLimit: p.trafficLimit ? Number(p.trafficLimit) : Number.MAX_SAFE_INTEGER })
        })
      }
    }
    const res = await fetch('/api/plans')
    const updatedPlans = await res.json()
    setGlobalPlans(updatedPlans)
    setPlans(updatedPlans.map((p: Plan) => ({ ...p, isEditing: false, newPrice: p.price, newFeatures: [...p.features] })))
    setSaving(false)
    setSaved(true)
    setHasChanges(false)
  }

  // Calculate price change statistics
  const priceChanges = plans.map(p => ({
    id: p.id,
    name: p.name,
    oldPrice: p.price,
    newPrice: p.newPrice,
    diff: p.newPrice - p.price,
    percentChange: ((p.newPrice - p.price) / p.price * 100).toFixed(1)
  })).filter(p => p.diff !== 0)

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('admin')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Управление ценами</h1>
          <p className="text-xs text-muted-foreground">Тарифы и функции</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-orange-500/30"
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={cn(
              'flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition-all',
              hasChanges
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-secondary text-muted-foreground'
            )}
          >
            {saving ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Сохранение...</span>
              </>
            ) : saved ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Сохранено</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Сохранить</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Changes summary */}
      {priceChanges.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Несохранённые изменения</span>
          </div>
          <div className="mt-2 space-y-1">
            {priceChanges.map(change => (
              <div key={change.id} className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">{change.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground line-through">{change.oldPrice} руб</span>
                  <span className="text-foreground font-medium">{change.newPrice} руб</span>
                  <span className={cn(
                    'font-semibold',
                    change.diff > 0 ? 'text-primary' : 'text-orange-400'
                  )}>
                    {change.diff > 0 ? '+' : ''}{change.percentChange}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <Package className="mx-auto h-4 w-4 text-muted-foreground" />
          <p className="mt-1 text-lg font-bold text-foreground">{plans.length}</p>
          <p className="text-[10px] text-muted-foreground">Тарифов</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <DollarSign className="mx-auto h-4 w-4 text-primary" />
          <p className="mt-1 text-lg font-bold text-foreground">{plans[0]?.newPrice}</p>
          <p className="text-[10px] text-muted-foreground">Мин. цена</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <TrendingUp className="mx-auto h-4 w-4 text-amber-400" />
          <p className="mt-1 text-lg font-bold text-foreground">{plans[plans.length - 1]?.newPrice}</p>
          <p className="text-[10px] text-muted-foreground">Макс. цена</p>
        </div>
      </div>

      {/* Plans list */}
      <h2 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold text-foreground">
        <DollarSign className="h-4 w-4 text-primary" />
        Тарифные планы
      </h2>

      <div className="space-y-3">
        {plans.map((plan) => {
          const Icon = planIcons[plan.id] || Shield
          const colors = planColors[plan.id] || planColors.scout
          const priceChanged = plan.newPrice !== plan.price
          const featuresChanged = JSON.stringify(plan.newFeatures) !== JSON.stringify(plan.features)

          return (
            <div
              key={plan.id}
              className={cn(
                'rounded-xl border bg-card overflow-hidden transition-all',
                plan.isEditing ? 'border-primary/40' : colors.border
              )}
            >
              {/* Plan header */}
              <div className={cn('p-4', plan.isEditing && 'bg-primary/5')}>
                <div className="flex items-start gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', colors.bg)}>
                    <Icon className={cn('h-5 w-5', colors.text)} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{plan.name}</h3>
                      {plan.badge && (
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold',
                          plan.popular ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                        )}>
                          {plan.badge}
                        </span>
                      )}
                      {(priceChanged || featuresChanged) && (
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Smartphone className="h-3 w-3" />
                      <span>{plan.devicesCount} устройств</span>
                      <span className="text-border">|</span>
                      <Zap className="h-3 w-3" />
                      <span>{plan.speedLabel}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleEditing(plan.id)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                      plan.isEditing
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>

                {/* Price editor */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-medium text-muted-foreground">Цена</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        value={plan.newPrice}
                        onChange={(e) => handlePriceChange(plan.id, parseInt(e.target.value) || 0)}
                        disabled={!plan.isEditing}
                        className={cn(
                          'w-24 rounded-lg border bg-background px-3 py-2 text-lg font-bold text-foreground transition-colors',
                          plan.isEditing
                            ? 'border-primary/30 focus:border-primary focus:outline-none'
                            : 'border-border cursor-default'
                        )}
                      />
                      <span className="text-sm text-muted-foreground">руб / мес</span>
                      {priceChanged && (
                        <span className={cn(
                          'text-xs font-semibold',
                          plan.newPrice > plan.price ? 'text-primary' : 'text-orange-400'
                        )}>
                          {plan.newPrice > plan.price ? '+' : ''}{plan.newPrice - plan.price} руб
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Features editor (expanded when editing) */}
              {plan.isEditing && (
                <div className="border-t border-border bg-secondary/30 p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Функции тарифа</label>
                    <button
                      onClick={() => handleAddFeature(plan.id)}
                      className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      <Plus className="h-3 w-3" />
                      Добавить
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {plan.newFeatures.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => handleFeatureChange(plan.id, idx, e.target.value)}
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors focus:border-primary focus:outline-none"
                        />
                        <button
                          onClick={() => handleRemoveFeature(plan.id, idx)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Features preview (collapsed) */}
              {!plan.isEditing && (
                <div className="border-t border-border px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {plan.newFeatures.slice(0, 4).map((feature, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {feature}
                      </span>
                    ))}
                    {plan.newFeatures.length > 4 && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                        +{plan.newFeatures.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Price comparison chart */}
      <h2 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold text-foreground">
        <TrendingUp className="h-4 w-4 text-primary" />
        Сравнение цен
      </h2>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="space-y-3">
          {plans.map((plan) => {
            const maxPrice = Math.max(...plans.map(p => p.newPrice))
            const percentage = (plan.newPrice / maxPrice) * 100
            const colors = planColors[plan.id] || planColors.scout

            return (
              <div key={plan.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{plan.name}</span>
                  <span className={cn('font-bold', colors.text)}>{plan.newPrice} руб</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', colors.bg.replace('/10', ''))}
                    style={{ width: `${percentage}%`, backgroundColor: colors.text.replace('text-', 'var(--') }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">
              {Math.round(plans.reduce((a, p) => a + p.newPrice, 0) / plans.length)}
            </p>
            <p className="text-[10px] text-muted-foreground">Средняя цена (руб)</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">
              {plans[plans.length - 1]?.newPrice - plans[0]?.newPrice}
            </p>
            <p className="text-[10px] text-muted-foreground">Разброс цен (руб)</p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <h3 className="text-xs font-semibold text-primary">Советы по ценообразованию</h3>
        <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
          <li>-- Минимальный тариф привлекает новых пользователей</li>
          <li>-- Популярный тариф должен быть в середине ценового диапазона</li>
          <li>-- VIP тариф создаёт якорную цену для остальных</li>
          <li>-- Разница между соседними тарифами должна быть ощутимой</li>
        </ul>
      </div>
    </div>
  )
}
