'use client'

import { useState } from 'react'
import {
  ArrowLeft, Percent, Tag, Plus, Calendar, Users, Trash2,
  Check, X, Copy, Gift, Zap, Shield, Gem, Sparkles, Edit2, Power
} from 'lucide-react'
import type { AppView, Discount } from '@/lib/types'
import { MOCK_DISCOUNTS, PLANS } from '@/lib/store'
import { cn } from '@/lib/utils'

interface AdminDiscountsViewProps {
  onNavigate: (view: AppView) => void
}

export function AdminDiscountsView({ onNavigate }: AdminDiscountsViewProps) {
  const [discounts, setDiscounts] = useState<Discount[]>(MOCK_DISCOUNTS)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Form state
  const [formCode, setFormCode] = useState('')
  const [formType, setFormType] = useState<'percent' | 'fixed'>('percent')
  const [formValue, setFormValue] = useState('')
  const [formMinPurchase, setFormMinPurchase] = useState('')
  const [formMaxUses, setFormMaxUses] = useState('')
  const [formValidFrom, setFormValidFrom] = useState('')
  const [formValidTo, setFormValidTo] = useState('')
  const [formPlans, setFormPlans] = useState<string[]>([])
  const [formAllPlans, setFormAllPlans] = useState(true)
  const [formDescription, setFormDescription] = useState('')

  function resetForm() {
    setFormCode('')
    setFormType('percent')
    setFormValue('')
    setFormMinPurchase('')
    setFormMaxUses('')
    setFormValidFrom('')
    setFormValidTo('')
    setFormPlans([])
    setFormAllPlans(true)
    setFormDescription('')
    setEditingDiscount(null)
  }

  function openAddModal() {
    resetForm()
    setShowAddModal(true)
  }

  function openEditModal(discount: Discount) {
    setEditingDiscount(discount)
    setFormCode(discount.code)
    setFormType(discount.type)
    setFormValue(discount.value.toString())
    setFormMinPurchase(discount.minPurchase?.toString() || '')
    setFormMaxUses(discount.maxUses?.toString() || '')
    setFormValidFrom(discount.validFrom)
    setFormValidTo(discount.validTo)
    setFormAllPlans(discount.applicablePlans === 'all')
    setFormPlans(discount.applicablePlans === 'all' ? [] : discount.applicablePlans)
    setFormDescription(discount.description || '')
    setShowAddModal(true)
  }

  function handleSaveDiscount() {
    const newDiscount: Discount = {
      id: editingDiscount?.id || `disc-${Date.now()}`,
      code: formCode.toUpperCase(),
      type: formType,
      value: Number(formValue),
      minPurchase: formMinPurchase ? Number(formMinPurchase) : undefined,
      maxUses: formMaxUses ? Number(formMaxUses) : undefined,
      usedCount: editingDiscount?.usedCount || 0,
      validFrom: formValidFrom,
      validTo: formValidTo,
      applicablePlans: formAllPlans ? 'all' : formPlans,
      isActive: editingDiscount?.isActive ?? true,
      description: formDescription || undefined,
    }

    if (editingDiscount) {
      setDiscounts(prev => prev.map(d => d.id === editingDiscount.id ? newDiscount : d))
    } else {
      setDiscounts(prev => [newDiscount, ...prev])
    }
    setShowAddModal(false)
    resetForm()
  }

  function handleToggleActive(id: string) {
    setDiscounts(prev => prev.map(d =>
      d.id === id ? { ...d, isActive: !d.isActive } : d
    ))
  }

  function handleDelete(id: string) {
    setDiscounts(prev => prev.filter(d => d.id !== id))
  }

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  function togglePlan(planId: string) {
    setFormPlans(prev =>
      prev.includes(planId) ? prev.filter(p => p !== planId) : [...prev, planId]
    )
  }

  const activeDiscounts = discounts.filter(d => d.isActive)
  const inactiveDiscounts = discounts.filter(d => !d.isActive)

  const totalUsed = discounts.reduce((a, d) => a + d.usedCount, 0)
  const totalSavings = discounts.reduce((a, d) => {
    if (d.type === 'fixed') return a + (d.usedCount * d.value)
    return a + (d.usedCount * (d.value / 100) * 100) // avg 100 rub order
  }, 0)

  const PLAN_ICONS: Record<string, typeof Sparkles> = {
    scout: Sparkles,
    guardian: Shield,
    fortress: Zap,
    citadel: Gem,
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('admin')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Скидки и промокоды</h1>
          <p className="text-xs text-muted-foreground">Управление акциями</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Создать
        </button>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <Tag className="mx-auto h-4 w-4 text-primary" />
          <p className="mt-1 text-lg font-bold text-foreground">{activeDiscounts.length}</p>
          <p className="text-[10px] text-muted-foreground">Активных</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <Users className="mx-auto h-4 w-4 text-primary" />
          <p className="mt-1 text-lg font-bold text-foreground">{totalUsed}</p>
          <p className="text-[10px] text-muted-foreground">Использований</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <Gift className="mx-auto h-4 w-4 text-primary" />
          <p className="mt-1 text-lg font-bold text-foreground">{(totalSavings / 1000).toFixed(1)}K</p>
          <p className="text-[10px] text-muted-foreground">Экономия юзеров</p>
        </div>
      </div>

      {/* Active discounts */}
      <h2 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold text-foreground">
        <div className="h-2 w-2 rounded-full bg-primary" />
        Активные промокоды
      </h2>
      <div className="space-y-3">
        {activeDiscounts.map((discount) => (
          <DiscountCard
            key={discount.id}
            discount={discount}
            onEdit={() => openEditModal(discount)}
            onToggle={() => handleToggleActive(discount.id)}
            onDelete={() => handleDelete(discount.id)}
            onCopy={() => handleCopyCode(discount.code)}
            copied={copiedCode === discount.code}
          />
        ))}
        {activeDiscounts.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Tag className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">Нет активных промокодов</p>
          </div>
        )}
      </div>

      {/* Inactive discounts */}
      {inactiveDiscounts.length > 0 && (
        <>
          <h2 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            Неактивные
          </h2>
          <div className="space-y-3">
            {inactiveDiscounts.map((discount) => (
              <DiscountCard
                key={discount.id}
                discount={discount}
                onEdit={() => openEditModal(discount)}
                onToggle={() => handleToggleActive(discount.id)}
                onDelete={() => handleDelete(discount.id)}
                onCopy={() => handleCopyCode(discount.code)}
                copied={copiedCode === discount.code}
              />
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-4">
              <h3 className="text-lg font-bold text-foreground">
                {editingDiscount ? 'Редактировать' : 'Новый промокод'}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); resetForm() }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-4 p-4">
              {/* Code */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Промокод
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="EXAMPLE20"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Type */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Тип скидки
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormType('percent')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors',
                      formType === 'percent'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary text-muted-foreground'
                    )}
                  >
                    <Percent className="h-4 w-4" />
                    Процент
                  </button>
                  <button
                    onClick={() => setFormType('fixed')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors',
                      formType === 'fixed'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary text-muted-foreground'
                    )}
                  >
                    <Tag className="h-4 w-4" />
                    Фикс. сумма
                  </button>
                </div>
              </div>

              {/* Value */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {formType === 'percent' ? 'Размер скидки (%)' : 'Сумма скидки (руб)'}
                </label>
                <input
                  type="number"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder={formType === 'percent' ? '20' : '50'}
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Min purchase */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Мин. сумма покупки (руб) <span className="text-muted-foreground/50">— опционально</span>
                </label>
                <input
                  type="number"
                  value={formMinPurchase}
                  onChange={(e) => setFormMinPurchase(e.target.value)}
                  placeholder="99"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Max uses */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Макс. использований <span className="text-muted-foreground/50">— опционально</span>
                </label>
                <input
                  type="number"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  placeholder="500"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Действует с
                  </label>
                  <input
                    type="date"
                    value={formValidFrom}
                    onChange={(e) => setFormValidFrom(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Действует до
                  </label>
                  <input
                    type="date"
                    value={formValidTo}
                    onChange={(e) => setFormValidTo(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Applicable plans */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Применяется к тарифам
                </label>
                <div className="mb-2">
                  <button
                    onClick={() => { setFormAllPlans(!formAllPlans); setFormPlans([]) }}
                    className={cn(
                      'flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors',
                      formAllPlans
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary text-muted-foreground'
                    )}
                  >
                    <Check className={cn('h-4 w-4', !formAllPlans && 'opacity-0')} />
                    Все тарифы
                  </button>
                </div>
                {!formAllPlans && (
                  <div className="grid grid-cols-2 gap-2">
                    {PLANS.map((plan) => {
                      const Icon = PLAN_ICONS[plan.id] || Sparkles
                      const selected = formPlans.includes(plan.id)
                      return (
                        <button
                          key={plan.id}
                          onClick={() => togglePlan(plan.id)}
                          className={cn(
                            'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                            selected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-secondary text-muted-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {plan.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Описание <span className="text-muted-foreground/50">— опционально</span>
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Скидка для новых пользователей"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSaveDiscount}
                disabled={!formCode || !formValue || !formValidFrom || !formValidTo}
                className="mt-2 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-110 disabled:opacity-50"
              >
                {editingDiscount ? 'Сохранить' : 'Создать промокод'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface DiscountCardProps {
  discount: Discount
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  onCopy: () => void
  copied: boolean
}

function DiscountCard({ discount, onEdit, onToggle, onDelete, onCopy, copied }: DiscountCardProps) {
  const isExpired = new Date(discount.validTo) < new Date()
  const isLimitReached = discount.maxUses && discount.usedCount >= discount.maxUses
  const usagePercent = discount.maxUses ? (discount.usedCount / discount.maxUses) * 100 : 0

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 transition-colors',
        !discount.isActive ? 'border-border opacity-60' : 'border-primary/20'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            discount.type === 'percent' ? 'bg-primary/15' : 'bg-amber-500/15'
          )}>
            {discount.type === 'percent' ? (
              <Percent className="h-5 w-5 text-primary" />
            ) : (
              <Tag className="h-5 w-5 text-amber-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={onCopy}
                className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 font-mono text-sm font-bold text-foreground transition-colors hover:bg-primary/20"
              >
                {discount.code}
                {copied ? (
                  <Check className="h-3 w-3 text-primary" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
              {!discount.isActive && (
                <span className="rounded-full bg-muted-foreground/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Выкл
                </span>
              )}
              {isExpired && discount.isActive && (
                <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-medium text-destructive">
                  Истек
                </span>
              )}
              {isLimitReached && discount.isActive && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                  Лимит
                </span>
              )}
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">
              {discount.type === 'percent' ? `-${discount.value}%` : `-${discount.value} руб`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary transition-colors hover:bg-primary/20"
          >
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={onToggle}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              discount.isActive ? 'bg-primary/15 hover:bg-primary/25' : 'bg-secondary hover:bg-primary/20'
            )}
          >
            <Power className={cn('h-3.5 w-3.5', discount.isActive ? 'text-primary' : 'text-muted-foreground')} />
          </button>
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary transition-colors hover:bg-destructive/20"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {discount.description && (
        <p className="mt-2 text-xs text-muted-foreground">{discount.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {discount.validFrom} - {discount.validTo}
        </span>
        {discount.minPurchase && (
          <span>от {discount.minPurchase} руб</span>
        )}
        <span>
          {discount.applicablePlans === 'all'
            ? 'Все тарифы'
            : discount.applicablePlans.map(p => PLANS.find(pl => pl.id === p)?.name).join(', ')}
        </span>
      </div>

      {/* Usage bar */}
      {discount.maxUses && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Использовано</span>
            <span className="font-medium text-foreground">
              {discount.usedCount} / {discount.maxUses}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                usagePercent >= 100 ? 'bg-destructive' : usagePercent >= 80 ? 'bg-amber-500' : 'bg-primary'
              )}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
