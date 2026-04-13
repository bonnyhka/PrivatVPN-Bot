'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, CreditCard, CheckCircle2, Loader2, Copy, Check, Sparkles, Wallet } from 'lucide-react'
import type { Plan, AppView } from '@/lib/types'
import { cn } from '@/lib/utils'
import { applySystemDiscount, getPlanBasePrice, getSystemDiscountRate } from '@/lib/payments'
import { miniAppToast } from '@/lib/miniapp-toast'

interface PaymentViewProps {
  plan: Plan | null
  isGift: boolean
  setIsGift: (val: boolean) => void
  onNavigate: (view: AppView) => void
}

type PaymentMethod = 'crystalpay' | 'heleket'
type PaymentStep = 'method' | 'processing' | 'success'

const PAYMENT_METHODS: { id: PaymentMethod; label: string; checkoutLabel: string; icon?: typeof CreditCard; image?: string }[] = [
  { id: 'crystalpay', label: 'CrystalPay (СБП)', checkoutLabel: 'CrystalPay', image: '/images/crystalpay.png' },
  { id: 'heleket', label: 'Heleket (Крипта)', checkoutLabel: 'Heleket', image: '/images/heleket.png' },
]

export function PaymentView({ user, plan, isGift, setIsGift, onNavigate }: { user: any, plan: Plan | null, isGift: boolean, setIsGift: (v: boolean) => void, onNavigate: (v: AppView) => void }) {
  const [method, setMethod] = useState<PaymentMethod | null>('crystalpay')
  const [step, setStep] = useState<PaymentStep>('method')
  const [months, setMonths] = useState<number>(1)
  const [copied, setCopied] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null)
  const [autoPromo, setAutoPromo] = useState<any | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [receiverUsername, setReceiverUsername] = useState('')
  const [isPreOrder, setIsPreOrder] = useState(false)
  const [recipientInfo, setRecipientInfo] = useState<{ found: boolean, level: number, currentPlanId: string | null } | null>(null)
  const [isCheckingRecipient, setIsCheckingRecipient] = useState(false)
  const [useBalance, setUseBalance] = useState(false)
  const selectedMethodLabel = PAYMENT_METHODS.find((item) => item.id === method)?.checkoutLabel || 'платежа'
  const availableBalance = Math.max(0, Math.floor(Number(user?.balance || 0)))

  // Check recipient plan level
  useEffect(() => {
    if (!isGift || !receiverUsername || receiverUsername.length < 3) {
      setRecipientInfo(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsCheckingRecipient(true)
      try {
        const res = await fetch(`/api/user/check-recipient?username=${receiverUsername}`)
        const data = await res.json()
        setRecipientInfo(data)
      } catch (e) {
        console.error('Check recipient failed:', e)
      } finally {
        setIsCheckingRecipient(false)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [receiverUsername, isGift])

  useEffect(() => {
    if (!plan) {
      setAutoPromo(null)
      return
    }

    let cancelled = false

    const loadAutoPromo = async () => {
      try {
        const res = await fetch(`/api/promos/validate?planId=${plan.id}&months=${months}&isGift=${isGift ? '1' : '0'}`)
        const data = await res.json()
        if (!cancelled) {
          setAutoPromo(data.auto && data.promo ? data.promo : null)
        }
      } catch (error) {
        if (!cancelled) setAutoPromo(null)
      }
    }

    loadAutoPromo()

    return () => {
      cancelled = true
    }
  }, [plan?.id, months, isGift])

  useEffect(() => {
    if (availableBalance <= 0) {
      setUseBalance(false)
    }
  }, [availableBalance])

  if (!plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="text-muted-foreground">План не выбран</p>
        <button
          onClick={() => onNavigate('plans')}
          className="mt-4 text-sm text-primary underline"
        >
          Выбрать тариф
        </button>
      </div>
    )
  }

  const handleApplyPromo = async () => {
    if (!promoCode || !plan) return
    setIsValidating(true)
    try {
      const res = await fetch(`/api/promos/validate?code=${encodeURIComponent(promoCode.trim())}&planId=${encodeURIComponent(plan.id)}&months=${months}&isGift=${isGift ? '1' : '0'}`)
      const data = await res.json()
      if (data.promo) {
        setAppliedPromo(data.promo)
        miniAppToast.success('Промокод применён')
      } else {
        miniAppToast.error(data.error || 'Ошибка проверки')
      }
    } catch (e) {
      miniAppToast.error('Сервис недоступен')
    }
    setIsValidating(false)
  }

  const basePrice = getPlanBasePrice(plan.id, plan.price, months)
  
  // Phase 6 Discount Logic
  const systemDiscount = getSystemDiscountRate(months, isGift)

  const priceAfterSystemDiscount = applySystemDiscount(basePrice, months, isGift)
  const activePromo = appliedPromo || autoPromo
  const finalPrice = activePromo
    ? (activePromo.type === 'percent'
        ? Math.floor(priceAfterSystemDiscount * (1 - activePromo.value / 100))
        : Math.max(0, priceAfterSystemDiscount - activePromo.value))
    : priceAfterSystemDiscount
  const balanceToApply = useBalance ? Math.min(availableBalance, finalPrice) : 0
  const payablePrice = Math.max(0, finalPrice - balanceToApply)
  const recipientUsername = receiverUsername.trim()
  const isRecipientMissing = isGift && recipientUsername.length < 3
  const isRecipientChecking = isGift && recipientUsername.length >= 3 && isCheckingRecipient
  const isRecipientUnknown = isGift && recipientUsername.length >= 3 && !isCheckingRecipient && recipientInfo?.found === false

  const handlePay = async () => {
    const requiresMethod = payablePrice > 0

    if ((!method && requiresMethod) || !plan) {
      miniAppToast.info('Выберите способ оплаты')
      return
    }

    const plansList = ['scout', 'guardian', 'fortress', 'citadel']
    const isActiveForSelf = user?.subscription?.status === 'active' && !isGift
    const currentLevel = isActiveForSelf ? plansList.indexOf(user.subscription.planId) : -1
    const selectedLevel = plansList.indexOf(plan.id)

    if (isActiveForSelf && selectedLevel < currentLevel) {
      miniAppToast.info('Понижение тарифа недоступно')
      return
    }

    if (isActiveForSelf && selectedLevel === currentLevel) {
      miniAppToast.info('У вас уже подключен этот тариф')
      return
    }

    if (isRecipientMissing) {
      miniAppToast.error('Укажите username получателя')
      return
    }

    if (isRecipientChecking) {
      miniAppToast.info('Проверяем username получателя')
      return
    }

    if (isRecipientUnknown) {
      miniAppToast.error('Пользователь с таким username не найден')
      return
    }

    if (isGift && recipientInfo?.found && recipientInfo.level >= selectedLevel && !isPreOrder) {
      miniAppToast.info('У получателя уже есть такой тариф')
      return
    }

    setStep('processing')
    
    try {
      const res = await fetch('/api/sub/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          promoCode: appliedPromo?.code || null,
          method,
          months,
          isGift,
          isPreOrder,
          receiverUsername: isGift ? receiverUsername.trim() : null,
          useBalance,
        })
      })
      const data = await res.json()
      
      if (data.success && data.paymentUrl) {
        // Redirect to CrystalPay
        window.location.href = data.paymentUrl
      } else if (data.success && data.subscription) {
        // Fallback for immediate success if enabled
        setStep('success')
        setAppliedPromo(data.subscription)
      } else {
        setStep('method')
        miniAppToast.error(data.error || 'Ошибка платежа')
      }
    } catch (e) {
      setStep('method')
      miniAppToast.error('Ошибка сети')
    }
  }

  const handleCopyKey = () => {
    const key = appliedPromo?.subscriptionUrl || 'vless://loading...'
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (step === 'processing') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 pb-24">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <p className="mt-6 text-lg font-semibold text-foreground">Переходим к оплате...</p>
        <p className="mt-2 text-sm text-muted-foreground">Подготавливаем страницу {selectedMethodLabel}</p>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 pb-24">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/20 bg-primary/10 glow-blue">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
        <p className="mt-6 text-lg font-bold text-foreground">Оплата прошла успешно!</p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Ваш VPN ключ для тарифа {plan.name} готов
        </p>

        <div className="mt-6 w-full max-w-sm rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs text-muted-foreground">Ваш VPN ключ:</p>
          <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
            <code className="flex-1 truncate font-mono text-xs text-primary">
              {appliedPromo?.subscriptionUrl || 'vless://...'}
            </code>
            <button
              onClick={handleCopyKey}
              className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Этот ключ также отправлен вам в бот
          </p>
        </div>

        <button
          onClick={() => onNavigate('my-vpn')}
          className="mt-6 w-full max-w-sm rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          Перейти к моему VPN
        </button>
        <button
          onClick={() => onNavigate('home')}
          className="mt-2 text-sm text-muted-foreground underline"
        >
          На главную
        </button>
      </div>
    )
  }

  return (
    <div className="app-screen-shell min-h-screen px-4 pb-24 pt-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <button
          onClick={() => onNavigate('plans')}
          className="mb-5 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к тарифам
        </button>

        <div className="rounded-[1.75rem] border border-border bg-card/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {isGift ? 'Подарок' : 'Подписка'}
              </p>
              <h1 className="mt-2 text-[1.9rem] font-black leading-[1.02] tracking-[-0.045em] text-foreground">
                {plan.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-secondary/55 px-3 py-1.5 text-[11px] font-medium text-secondary-foreground">
                  {plan.devicesCount} {plan.devicesCount === 1 ? 'устройство' : plan.devicesCount < 5 ? 'устройства' : 'устройств'}
                </span>
                <span className="rounded-full bg-secondary/55 px-3 py-1.5 text-[11px] font-medium text-secondary-foreground">
                  {plan.speedLabel}
                </span>
                <span className="rounded-full bg-secondary/55 px-3 py-1.5 text-[11px] font-medium text-secondary-foreground">
                  {months === 1 ? plan.period : `${months} мес.`}
                </span>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-[2.1rem] font-black tracking-[-0.06em] text-foreground">
                {payablePrice} ₽
              </div>
              {(appliedPromo || systemDiscount > 0) && (
                <p className="mt-1 text-[11px] text-muted-foreground line-through">{basePrice} ₽</p>
              )}
              {balanceToApply > 0 && (
                <p className="mt-1 text-[11px] text-primary">Баланс: -{balanceToApply} ₽</p>
              )}
            </div>
          </div>
        </div>

        {isGift && (
          <div className="rounded-[1.5rem] border border-primary/25 bg-primary/5 p-4">
          <p className="mb-3 text-xs font-bold text-foreground">Получатель подарка</p>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <input
                type="text"
                value={receiverUsername}
                onChange={(e) => setReceiverUsername(e.target.value.replace(/^@/, ''))}
                placeholder="username_друга"
                className="w-full rounded-xl border border-border bg-card px-8 py-3 text-sm text-foreground transition-all focus:border-primary focus:outline-none"
              />
              {isCheckingRecipient && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>

            {isRecipientMissing && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Укажите username получателя, чтобы продолжить оплату.
              </p>
            )}

            {isRecipientUnknown && (
              <div className="mt-3 rounded-xl border border-border/80 bg-white/[0.03] px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">
                  Убедитесь, что username указан без ошибок.
                </p>
              </div>
            )}

            {recipientInfo?.found && (
              <div className="mt-3 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2.5">
                <p className="text-[11px] text-orange-300">
                  {recipientInfo.level >= ['scout', 'guardian', 'fortress', 'citadel'].indexOf(plan.id)
                    ? `У @${receiverUsername} уже есть тариф ${recipientInfo.currentPlanId?.toUpperCase()}.`
                    : `У @${receiverUsername} сейчас тариф ${recipientInfo.currentPlanId?.toUpperCase() || 'без активного тарифа'}.`}
                </p>
              </div>
            )}

            {recipientInfo?.found && recipientInfo.level >= ['scout', 'guardian', 'fortress', 'citadel'].indexOf(plan.id) && (
              <button
                onClick={() => setIsPreOrder(!isPreOrder)}
                className={cn(
                  'mt-3 flex items-center gap-2 rounded-xl border p-3 transition-all',
                  isPreOrder ? 'border-primary bg-primary/10' : 'border-border bg-card'
                )}
              >
                <div className={cn('flex h-4 w-4 items-center justify-center rounded border', isPreOrder ? 'border-primary bg-primary' : 'border-border')}>
                  {isPreOrder && <Check className="h-3 w-3 text-white" />}
                </div>
                <p className="text-[11px] font-bold text-foreground">Оформить как предзаказ</p>
              </button>
            )}

            {isPreOrder && (
              <p className="mt-3 text-[10px] leading-tight text-muted-foreground">
                Подарок активируется сразу после окончания текущей подписки.
              </p>
            )}
          </div>
        )}

        <div>
          <h2 className="mb-3 text-sm font-bold text-muted-foreground">Период оплаты</h2>
          <div className="grid grid-cols-4 gap-2">
            {[1, 3, 6, 12].map(m => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border p-2 transition-all',
                  months === m
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                )}
              >
                <p className="text-lg font-bold">{m}</p>
                <p className="text-[10px] font-medium uppercase">мес</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Промокод</p>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Ввести код"
              disabled={!!appliedPromo}
              className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={appliedPromo ? () => { setAppliedPromo(null); setPromoCode('') } : handleApplyPromo}
              disabled={isValidating || (!promoCode && !appliedPromo)}
              className={cn(
                'rounded-xl px-4 py-2.5 text-xs font-bold transition-all',
                appliedPromo
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              )}
            >
              {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : (appliedPromo ? 'Удалить' : 'Ок')}
            </button>
          </div>
          {appliedPromo && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-medium text-primary">
                Скидка применена: {appliedPromo.type === 'percent' ? `-${appliedPromo.value}%` : `-${appliedPromo.value} руб`}
              </p>
            </div>
          )}
          {!appliedPromo && autoPromo && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-medium text-primary">
                Автоакция активна: {autoPromo.type === 'percent' ? `-${autoPromo.value}%` : `-${autoPromo.value} руб`}
              </p>
            </div>
          )}
        </div>

        {availableBalance > 0 && (
          <div className="rounded-[1.5rem] border border-border bg-card p-4">
            <button
              type="button"
              onClick={() => setUseBalance((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-secondary/35 px-3 py-3 text-left transition-colors hover:bg-secondary/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Использовать баланс</p>
                  <p className="text-xs text-muted-foreground">Доступно {availableBalance} ₽</p>
                </div>
              </div>
              <div
                className={cn(
                  'flex h-6 w-10 items-center rounded-full border transition-colors',
                  useBalance ? 'border-primary bg-primary/20' : 'border-border bg-card'
                )}
              >
                <span
                  className={cn(
                    'h-4 w-4 rounded-full transition-all',
                    useBalance ? 'ml-5 bg-primary' : 'ml-1 bg-muted-foreground/40'
                  )}
                />
              </div>
            </button>
            {useBalance && balanceToApply > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Спишем {balanceToApply} ₽, к оплате останется {payablePrice} ₽.
              </p>
            )}
          </div>
        )}

        <div>
          <h2 className="mb-3 text-sm font-bold text-muted-foreground">Способ оплаты</h2>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((pm) => {
              const isSelected = method === pm.id
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setMethod(pm.id)}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-[1.5rem] border bg-card/95 p-5 text-left shadow-sm transition-all',
                    isSelected
                      ? 'border-primary/20 shadow-[0_14px_36px_rgba(59,130,246,0.12)]'
                      : 'border-border hover:border-primary/20 hover:bg-card'
                  )}
                >
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#49b8e8]/15">
                    {pm.image ? (
                      <img src={pm.image} alt={pm.label} className="h-full w-full object-cover" />
                    ) : (
                      pm.icon && <pm.icon className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-base font-bold text-foreground">
                      {pm.label}
                    </p>
                  </div>
                  <div className={cn(
                    'ml-auto rounded-full px-3 py-1',
                    isSelected ? 'bg-primary/10' : 'bg-secondary/50'
                  )}>
                    <p className={cn(
                      'text-[10px] font-bold',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {isSelected ? 'ВЫБРАНО' : 'ВЫБРАТЬ'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

      {/* Pay button with validation */}
      {(() => {
        const isActiveForSelf = user?.subscription?.status === 'active' && !isGift
        const plansList = ['scout', 'guardian', 'fortress', 'citadel']
        const currentLevel = isActiveForSelf ? plansList.indexOf(user.subscription.planId) : -1
        const selectedLevel = plansList.indexOf(plan.id)
        
        let disabled = false
        let reason = ''

        if (isActiveForSelf) {
          if (selectedLevel < currentLevel) {
            disabled = true
            reason = 'Понижение тарифа недоступно'
          } else if (selectedLevel === currentLevel) {
            disabled = true
            reason = 'У вас уже подключен этот тариф'
          }
        }

        return (
          <div className="mt-2 flex flex-col gap-2">
            <button
              onClick={handlePay}
              disabled={(!method && payablePrice > 0) || disabled}
              className={cn(
                'w-full rounded-xl py-3.5 text-sm font-semibold transition-all',
                (method || payablePrice === 0) && !disabled
                  ? 'bg-primary text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/20'
                  : 'cursor-not-allowed bg-secondary text-muted-foreground'
              )}
            >
              {disabled ? reason : `Оплатить ${payablePrice} \u20BD`}
            </button>

            <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/35">
                Условия оплаты
              </p>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                Продолжая оплату, вы принимаете{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('documents')}
                  className="font-medium text-foreground underline decoration-white/20 underline-offset-4 transition-colors hover:text-primary"
                >
                  оферту
                </button>
                ,{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('documents')}
                  className="font-medium text-foreground underline decoration-white/20 underline-offset-4 transition-colors hover:text-primary"
                >
                  политику конфиденциальности
                </button>
                {' '}и{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('documents')}
                  className="font-medium text-foreground underline decoration-white/20 underline-offset-4 transition-colors hover:text-primary"
                >
                  правила возврата
                </button>
                .
              </p>
            </div>
          </div>
        )
      })()}
      </div>
    </div>
  )
}
