'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  Edit2,
  Gift,
  Megaphone,
  Percent,
  Plus,
  Power,
  Shield,
  Sparkles,
  Tag,
  Trash2,
  Users,
  X,
  Zap,
  Gem,
  Clock3,
} from 'lucide-react'
import type { AppView, Discount, Plan } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AdminDiscountsViewProps {
  plans: Plan[]
  onNavigate: (view: AppView) => void
}

type DiscountMode = Discount['mode']
type DiscountDelivery = Discount['delivery']
type DiscountAudience = Discount['audience']

const MODE_LABELS: Record<DiscountMode, string> = {
  promo: 'Промокод',
  global: 'Акция для всех',
  compensation: 'Компенсация',
}

const DELIVERY_LABELS: Record<DiscountDelivery, string> = {
  code: 'По коду',
  auto: 'Автоматически',
  broadcast: 'Рассылка с кодом',
}

const AUDIENCE_LABELS: Record<DiscountAudience, string> = {
  all: 'Все пользователи',
  active: 'Активная подписка',
  expired: 'Истекшая подписка',
  paid: 'Платившие пользователи',
  custom: 'Выбранные пользователи',
}

function formatDateInput(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function formatDateLabel(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU')
}

function createDefaultValidTo() {
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  return nextWeek.toISOString().slice(0, 10)
}

function createNewFormState() {
  return {
    code: '',
    mode: 'promo' as DiscountMode,
    delivery: 'code' as DiscountDelivery,
    audience: 'all' as DiscountAudience,
    type: 'percent' as Discount['type'],
    value: '',
    compensationDays: '',
    minPurchase: '',
    maxUses: '',
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: createDefaultValidTo(),
    plans: [] as string[],
    allPlans: true,
    description: '',
    targetUsers: '',
    broadcastText: '',
  }
}

function discountToPayload(discount: Discount, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: discount.id,
    code: discount.code,
    mode: discount.mode,
    delivery: discount.delivery,
    audience: discount.audience,
    type: discount.type,
    value: discount.value,
    compensationDays: discount.compensationDays ?? null,
    minPurchase: discount.minPurchase ?? null,
    maxUses: discount.maxUses ?? null,
    validFrom: formatDateInput(discount.validFrom),
    validTo: formatDateInput(discount.validTo),
    applicablePlans: discount.applicablePlans === 'all' ? 'all' : discount.applicablePlans,
    isActive: discount.isActive,
    description: discount.description || null,
    targetUsers: discount.targetUsers || null,
    broadcastText: discount.broadcastText || null,
    ...overrides,
  }
}

export function AdminDiscountsView({ plans, onNavigate }: AdminDiscountsViewProps) {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formState, setFormState] = useState(createNewFormState())

  const PLAN_ICONS: Record<string, typeof Sparkles> = {
    scout: Sparkles,
    guardian: Shield,
    fortress: Zap,
    citadel: Gem,
  }

  async function loadDiscounts() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/discounts')
      const data = await res.json()
      setDiscounts(data.discounts || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDiscounts()
  }, [])

  function resetForm() {
    setFormState(createNewFormState())
    setEditingDiscount(null)
    setFormError(null)
  }

  function openAddModal() {
    resetForm()
    setShowAddModal(true)
  }

  function openEditModal(discount: Discount) {
    setEditingDiscount(discount)
    setFormState({
      code: discount.code,
      mode: discount.mode,
      delivery: discount.delivery,
      audience: discount.audience,
      type: discount.type,
      value: String(discount.value),
      compensationDays: discount.compensationDays != null ? String(discount.compensationDays) : '',
      minPurchase: discount.minPurchase != null ? String(discount.minPurchase) : '',
      maxUses: discount.maxUses != null ? String(discount.maxUses) : '',
      validFrom: formatDateInput(discount.validFrom),
      validTo: formatDateInput(discount.validTo),
      plans: discount.applicablePlans === 'all' ? [] : discount.applicablePlans,
      allPlans: discount.applicablePlans === 'all',
      description: discount.description || '',
      targetUsers: discount.targetUsers || '',
      broadcastText: discount.broadcastText || '',
    })
    setFormError(null)
    setShowAddModal(true)
  }

  function setField<K extends keyof typeof formState>(field: K, value: (typeof formState)[K]) {
    setFormState(prev => ({ ...prev, [field]: value }))
  }

  function togglePlan(planId: string) {
    setFormState(prev => ({
      ...prev,
      plans: prev.plans.includes(planId)
        ? prev.plans.filter(item => item !== planId)
        : [...prev.plans, planId],
    }))
  }

  async function handleSaveDiscount() {
    setFormError(null)

    if (formState.mode !== 'compensation' && !formState.value) {
      setFormError('Укажи размер скидки')
      return
    }
    if (formState.mode === 'compensation' && !formState.compensationDays) {
      setFormError('Укажи количество дней компенсации')
      return
    }
    if (!formState.validFrom || !formState.validTo) {
      setFormError('Укажи период действия акции')
      return
    }
    if (!formState.allPlans && formState.plans.length === 0) {
      setFormError('Выбери хотя бы один тариф или включи "Все тарифы"')
      return
    }
    if (formState.audience === 'custom' && !formState.targetUsers.trim()) {
      setFormError('Для выбранной аудитории укажи пользователей')
      return
    }

    const payload = {
      id: editingDiscount?.id,
      code: formState.code.trim().toUpperCase(),
      mode: formState.mode,
      delivery: formState.delivery,
      audience: formState.audience,
      type: formState.type,
      value: formState.value,
      compensationDays: formState.mode === 'compensation' ? formState.compensationDays || null : null,
      minPurchase: formState.minPurchase || null,
      maxUses: formState.maxUses || null,
      validFrom: formState.validFrom,
      validTo: formState.validTo,
      applicablePlans: formState.allPlans ? 'all' : formState.plans,
      isActive: editingDiscount?.isActive ?? true,
      description: formState.description || null,
      targetUsers: formState.audience === 'custom' ? formState.targetUsers : null,
      broadcastText: formState.mode === 'promo' && formState.delivery === 'broadcast' ? formState.broadcastText : null,
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Не удалось сохранить акцию')
        return
      }

      if (editingDiscount) {
        setDiscounts(prev => prev.map(item => item.id === data.discount.id ? data.discount : item))
      } else {
        setDiscounts(prev => [data.discount, ...prev])
      }

      setShowAddModal(false)
      resetForm()
    } catch (error) {
      console.error(error)
      setFormError('Не удалось сохранить акцию')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(discount: Discount) {
    try {
      const res = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discountToPayload(discount, { isActive: !discount.isActive })),
      })
      const data = await res.json()
      if (data.discount) {
        setDiscounts(prev => prev.map(item => item.id === discount.id ? data.discount : item))
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function handleBroadcast(discount: Discount) {
    setBroadcastingId(discount.id)
    try {
      const res = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'broadcast', id: discount.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Не удалось отправить рассылку')
        return
      }
      await loadDiscounts()
      alert(`Рассылка отправлена: ${data.sentCount} из ${data.total}`)
    } catch (error) {
      console.error(error)
      alert('Не удалось отправить рассылку')
    } finally {
      setBroadcastingId(null)
    }
  }

  async function handleApplyCompensation(discount: Discount) {
    try {
      const res = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply_compensation', id: discount.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Не удалось начислить компенсацию')
        return
      }
      await loadDiscounts()
      alert(`Начислено ${data.days} дн. для ${data.appliedCount} подписок`)
    } catch (error) {
      console.error(error)
      alert('Не удалось начислить компенсацию')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить эту акцию?')) return
    try {
      await fetch(`/api/admin/discounts?id=${id}`, { method: 'DELETE' })
      setDiscounts(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      console.error(error)
    }
  }

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const activeDiscounts = discounts.filter(item => item.isActive)
  const inactiveDiscounts = discounts.filter(item => !item.isActive)
  const totalUsed = discounts.reduce((sum, item) => sum + item.usedCount, 0)
  const totalBroadcasts = discounts.filter(item => item.lastBroadcastAt).length
  const totalCompensations = discounts.filter(item => item.mode === 'compensation' && item.isActive).length

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('admin')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Скидки и акции</h1>
          <p className="text-xs text-muted-foreground">Промокоды, автоакции и компенсации</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Создать
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatCard icon={<Tag className="h-4 w-4 text-primary" />} value={activeDiscounts.length} label="Активных" />
        <StatCard icon={<Users className="h-4 w-4 text-primary" />} value={totalUsed} label="Использований" />
        <StatCard icon={<Megaphone className="h-4 w-4 text-primary" />} value={totalBroadcasts} label="Рассылок" />
      </div>

      {totalCompensations > 0 && (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Активные компенсации: {totalCompensations}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Начисляются отдельным действием и могут быть точечными по аудитории.
          </p>
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <div className="h-2 w-2 rounded-full bg-primary" />
          Активные
        </h2>
        <div className="space-y-3">
          {loading && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Загружаю акции...
            </div>
          )}
          {!loading && activeDiscounts.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Tag className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">Нет активных акций</p>
            </div>
          )}
          {activeDiscounts.map(discount => (
            <DiscountCard
              key={discount.id}
              discount={discount}
              plans={plans}
              onEdit={() => openEditModal(discount)}
              onToggle={() => handleToggleActive(discount)}
              onDelete={() => handleDelete(discount.id)}
              onCopy={() => handleCopyCode(discount.code)}
              onBroadcast={() => handleBroadcast(discount)}
              onApplyCompensation={() => handleApplyCompensation(discount)}
              copied={copiedCode === discount.code}
              broadcasting={broadcastingId === discount.id}
            />
          ))}
        </div>
      </section>

      {inactiveDiscounts.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            Неактивные
          </h2>
          <div className="space-y-3">
            {inactiveDiscounts.map(discount => (
              <DiscountCard
                key={discount.id}
                discount={discount}
                plans={plans}
                onEdit={() => openEditModal(discount)}
                onToggle={() => handleToggleActive(discount)}
                onDelete={() => handleDelete(discount.id)}
                onCopy={() => handleCopyCode(discount.code)}
                onBroadcast={() => handleBroadcast(discount)}
                onApplyCompensation={() => handleApplyCompensation(discount)}
                copied={copiedCode === discount.code}
                broadcasting={broadcastingId === discount.id}
              />
            ))}
          </div>
        </section>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {editingDiscount ? 'Редактирование акции' : 'Новая акция'}
                </h3>
                <p className="text-xs text-muted-foreground">Можно сделать общий автодискаунт, компенсацию или промокод</p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); resetForm() }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-5 p-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">Тип акции</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['promo', 'global', 'compensation'] as DiscountMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setField('mode', mode)}
                      className={cn(
                        'rounded-xl border px-3 py-3 text-sm font-medium transition-colors',
                        formState.mode === mode
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-secondary text-muted-foreground'
                      )}
                    >
                      {MODE_LABELS[mode]}
                    </button>
                  ))}
                </div>
              </div>

              {formState.mode === 'promo' && (
                <>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">Как применяется</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['code', 'broadcast'] as DiscountDelivery[]).map(delivery => (
                        <button
                          key={delivery}
                          onClick={() => setField('delivery', delivery)}
                          className={cn(
                            'rounded-xl border px-3 py-3 text-sm font-medium transition-colors',
                            formState.delivery === delivery
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-secondary text-muted-foreground'
                          )}
                        >
                          {DELIVERY_LABELS[delivery]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Код акции <span className="text-muted-foreground/50">— можно оставить пустым для автогенерации</span>
                    </label>
                    <input
                      type="text"
                      value={formState.code}
                      onChange={(e) => setField('code', e.target.value.toUpperCase())}
                      placeholder="SPRING50"
                      className="w-full rounded-xl border border-border bg-secondary px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </>
              )}

              {formState.mode === 'global' && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                  Эта акция применяется автоматически в оплате без промокода.
                </div>
              )}

              {formState.mode === 'compensation' && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-foreground">
                  Компенсация добавляет дни активным подпискам выбранной аудитории и не участвует в оплате.
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">Аудитория</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['all', 'active', 'expired', 'paid', 'custom'] as DiscountAudience[]).map(audience => (
                    <button
                      key={audience}
                      onClick={() => setField('audience', audience)}
                      className={cn(
                        'rounded-xl border px-3 py-3 text-sm font-medium transition-colors',
                        formState.audience === audience
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-secondary text-muted-foreground'
                      )}
                    >
                      {AUDIENCE_LABELS[audience]}
                    </button>
                  ))}
                </div>
              </div>

              {formState.audience === 'custom' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Пользователи <span className="text-muted-foreground/50">— username, telegram id или user id через запятую/перенос</span>
                  </label>
                  <textarea
                    value={formState.targetUsers}
                    onChange={(e) => setField('targetUsers', e.target.value)}
                    rows={4}
                    placeholder="@bonnyhka, 123456789"
                    className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              {formState.mode !== 'compensation' ? (
                <>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">Тип скидки</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setField('type', 'percent')}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors',
                          formState.type === 'percent'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-secondary text-muted-foreground'
                        )}
                      >
                        <Percent className="h-4 w-4" />
                        Проценты
                      </button>
                      <button
                        onClick={() => setField('type', 'fixed')}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors',
                          formState.type === 'fixed'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-secondary text-muted-foreground'
                        )}
                      >
                        <Tag className="h-4 w-4" />
                        Фикс. сумма
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Field label={formState.type === 'percent' ? 'Размер скидки (%)' : 'Сумма скидки (руб)'}>
                      <input
                        type="number"
                        value={formState.value}
                        onChange={(e) => setField('value', e.target.value)}
                        placeholder={formState.type === 'percent' ? '20' : '100'}
                        className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                    </Field>
                    <Field label="Мин. сумма покупки">
                      <input
                        type="number"
                        value={formState.minPurchase}
                        onChange={(e) => setField('minPurchase', e.target.value)}
                        placeholder="99"
                        className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                    </Field>
                    <Field label="Лимит использований">
                      <input
                        type="number"
                        value={formState.maxUses}
                        onChange={(e) => setField('maxUses', e.target.value)}
                        placeholder="500"
                        className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                    </Field>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Дней компенсации">
                    <input
                      type="number"
                      value={formState.compensationDays}
                      onChange={(e) => setField('compensationDays', e.target.value)}
                      placeholder="3"
                      className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                  </Field>
                  <Field label="Кому начислим">
                    <div className="rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
                      Только активным подпискам выбранной аудитории
                    </div>
                  </Field>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Действует с">
                  <input
                    type="date"
                    value={formState.validFrom}
                    onChange={(e) => setField('validFrom', e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </Field>
                <Field label="Действует до">
                  <input
                    type="date"
                    value={formState.validTo}
                    onChange={(e) => setField('validTo', e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </Field>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Тарифы</label>
                <button
                  onClick={() => setFormState(prev => ({ ...prev, allPlans: !prev.allPlans, plans: [] }))}
                  className={cn(
                    'mb-2 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors',
                    formState.allPlans
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary text-muted-foreground'
                  )}
                >
                  <Check className={cn('h-4 w-4', !formState.allPlans && 'opacity-0')} />
                  Все тарифы
                </button>
                {!formState.allPlans && (
                  <div className="grid grid-cols-2 gap-2">
                    {plans.map(plan => {
                      const Icon = PLAN_ICONS[plan.id] || Sparkles
                      const selected = formState.plans.includes(plan.id)
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

              <Field label="Описание">
                <input
                  type="text"
                  value={formState.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Компенсация за нестабильность сети"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </Field>

              {formState.mode === 'promo' && formState.delivery === 'broadcast' && (
                <Field label="Текст рассылки">
                  <textarea
                    value={formState.broadcastText}
                    onChange={(e) => setField('broadcastText', e.target.value)}
                    rows={5}
                    placeholder="Короткий текст для Telegram-рассылки. Если оставить пустым — соберём его автоматически."
                    className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </Field>
              )}

              {formError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <button
                onClick={handleSaveDiscount}
                disabled={saving}
                className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-110 disabled:opacity-50"
              >
                {saving ? 'Сохраняю...' : editingDiscount ? 'Сохранить изменения' : formState.mode === 'compensation' ? 'Создать компенсацию' : 'Создать акцию'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className="mx-auto flex h-5 w-5 items-center justify-center">{icon}</div>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

interface DiscountCardProps {
  discount: Discount
  plans: Plan[]
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  onCopy: () => void
  onBroadcast: () => void
  onApplyCompensation: () => void
  copied: boolean
  broadcasting: boolean
}

function DiscountCard({
  discount,
  plans,
  onEdit,
  onToggle,
  onDelete,
  onCopy,
  onBroadcast,
  onApplyCompensation,
  copied,
  broadcasting,
}: DiscountCardProps) {
  const isExpired = new Date(discount.validTo) < new Date()
  const isLimitReached = !!discount.maxUses && discount.usedCount >= discount.maxUses
  const usagePercent = discount.maxUses ? Math.min((discount.usedCount / discount.maxUses) * 100, 100) : 0
  const planLabel = discount.applicablePlans === 'all'
    ? 'Все тарифы'
    : discount.applicablePlans
      .map(planId => plans.find(plan => plan.id === planId)?.name || planId)
      .join(', ')

  return (
    <div
      className={cn(
        'rounded-2xl border bg-card p-4 transition-colors',
        discount.isActive ? 'border-primary/20' : 'border-border opacity-70'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl',
            discount.mode === 'compensation'
              ? 'bg-amber-500/15'
              : discount.delivery === 'auto'
                ? 'bg-primary/15'
                : 'bg-secondary'
          )}>
            {discount.mode === 'compensation' ? (
              <Gift className="h-5 w-5 text-amber-400" />
            ) : discount.type === 'percent' ? (
              <Percent className="h-5 w-5 text-primary" />
            ) : (
              <Tag className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {discount.mode === 'compensation' ? (
                <span className="rounded-lg bg-secondary px-2.5 py-1 font-mono text-sm font-bold text-foreground">
                  {discount.code}
                </span>
              ) : (
                <button
                  onClick={onCopy}
                  className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 font-mono text-sm font-bold text-foreground transition-colors hover:bg-primary/20"
                >
                  {discount.code}
                  {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                </button>
              )}
              {!discount.isActive && <Badge label="Выкл" tone="muted" />}
              {isExpired && discount.isActive && <Badge label="Истекла" tone="danger" />}
              {isLimitReached && discount.isActive && <Badge label="Лимит" tone="warning" />}
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">
              {discount.mode === 'compensation'
                ? `+${discount.compensationDays || 0} дн.`
                : discount.type === 'percent'
                  ? `-${discount.value}%`
                  : `-${discount.value} ₽`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {discount.delivery === 'broadcast' && discount.mode === 'promo' && (
            <button
              onClick={onBroadcast}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary transition-colors hover:bg-primary/20"
              title="Отправить рассылку"
            >
              {broadcasting ? (
                <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-primary" />
              ) : (
                <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          )}
          {discount.mode === 'compensation' && (
            <button
              onClick={onApplyCompensation}
              className="flex h-8 items-center justify-center rounded-lg bg-amber-500/10 px-2.5 text-[11px] font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
              title="Начислить компенсацию"
            >
              Начислить
            </button>
          )}
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary transition-colors hover:bg-primary/20"
            title="Редактировать"
          >
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={onToggle}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              discount.isActive ? 'bg-primary/15 hover:bg-primary/25' : 'bg-secondary hover:bg-primary/20'
            )}
            title={discount.isActive ? 'Выключить' : 'Включить'}
          >
            <Power className={cn('h-3.5 w-3.5', discount.isActive ? 'text-primary' : 'text-muted-foreground')} />
          </button>
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary transition-colors hover:bg-destructive/20"
            title="Удалить"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {discount.description && (
        <p className="mt-3 text-sm text-muted-foreground">{discount.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge label={MODE_LABELS[discount.mode]} tone="primary" />
        {discount.mode !== 'compensation' && (
          <Badge label={DELIVERY_LABELS[discount.delivery]} tone="neutral" />
        )}
        <Badge label={AUDIENCE_LABELS[discount.audience]} tone="neutral" />
        <Badge label={planLabel} tone="neutral" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div className="rounded-xl bg-secondary/60 p-3">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-foreground">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Период
          </p>
          <p>{formatDateLabel(discount.validFrom)} — {formatDateLabel(discount.validTo)}</p>
        </div>
        <div className="rounded-xl bg-secondary/60 p-3">
          <p className="mb-1 text-[11px] font-semibold text-foreground">Условия</p>
          {discount.mode === 'compensation' ? (
            <>
              <p>{`Добавим: ${discount.compensationDays || 0} дн.`}</p>
              <p>Только активным подпискам</p>
            </>
          ) : (
            <>
              <p>{discount.minPurchase ? `От ${discount.minPurchase} ₽` : 'Без минимальной суммы'}</p>
              <p>{discount.maxUses ? `Лимит: ${discount.maxUses}` : 'Без лимита'}</p>
            </>
          )}
        </div>
      </div>

      {discount.delivery === 'broadcast' && discount.mode === 'promo' && (
        <div className="mt-3 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
          <p className="text-[11px] font-semibold text-foreground">Рассылка</p>
          <p className="mt-1">{discount.lastBroadcastAt ? `Последняя отправка: ${new Date(discount.lastBroadcastAt).toLocaleString('ru-RU')}` : 'Ещё не отправлялась'}</p>
        </div>
      )}

      {discount.mode === 'compensation' && (
        <div className="mt-3 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
            <Clock3 className="h-3.5 w-3.5 text-primary" />
            Применение
          </p>
          <p className="mt-1">
            {discount.lastAppliedAt
              ? `Последнее начисление: ${new Date(discount.lastAppliedAt).toLocaleString('ru-RU')}`
              : 'Компенсация ещё не начислялась'}
          </p>
        </div>
      )}

      {discount.audience === 'custom' && discount.targetUsers && (
        <div className="mt-3 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
          <p className="text-[11px] font-semibold text-foreground">Выбранные пользователи</p>
          <p className="mt-1 whitespace-pre-wrap break-words">{discount.targetUsers}</p>
        </div>
      )}

      {discount.maxUses && discount.mode !== 'compensation' && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Использовано</span>
            <span className="font-medium text-foreground">
              {discount.usedCount} / {discount.maxUses}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                usagePercent >= 100 ? 'bg-destructive' : usagePercent >= 80 ? 'bg-amber-500' : 'bg-primary'
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Badge({ label, tone }: { label: string; tone: 'primary' | 'neutral' | 'warning' | 'danger' | 'muted' }) {
  const toneClass =
    tone === 'primary'
      ? 'bg-primary/10 text-primary border-primary/20'
      : tone === 'warning'
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        : tone === 'danger'
          ? 'bg-destructive/10 text-destructive border-destructive/20'
          : tone === 'muted'
            ? 'bg-muted-foreground/10 text-muted-foreground border-border'
            : 'bg-secondary text-muted-foreground border-border'

  return (
    <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-medium', toneClass)}>
      {label}
    </span>
  )
}
