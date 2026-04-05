'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, CreditCard, Smartphone, Wallet, CheckCircle2, Loader2, Copy, Check } from 'lucide-react'
import { Shield, Star, Crown, Info, FileText, ChevronRight } from 'lucide-react'
import type { Plan, AppView } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Tag, Sparkles, Gift, Users } from 'lucide-react'

interface PaymentViewProps {
  plan: Plan | null
  isGift: boolean
  setIsGift: (val: boolean) => void
  onNavigate: (view: AppView) => void
}

type PaymentMethod = 'yoomoney'
type PaymentStep = 'method' | 'processing' | 'success'

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon?: typeof CreditCard; image?: string; description: string }[] = [
  { id: 'yoomoney', label: 'ЮMoney', image: '/images/yoomoney.png', description: 'Платежная страница' },
]

export function PaymentView({ user, plan, isGift, setIsGift, onNavigate }: { user: any, plan: Plan | null, isGift: boolean, setIsGift: (v: boolean) => void, onNavigate: (v: AppView) => void }) {
  const [method, setMethod] = useState<PaymentMethod | null>('yoomoney')
  const [step, setStep] = useState<PaymentStep>('method')
  const [months, setMonths] = useState<number>(1)
  const [copied, setCopied] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null)
  const [autoPromo, setAutoPromo] = useState<any | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [receiverUsername, setReceiverUsername] = useState('')
  const [isPreOrder, setIsPreOrder] = useState(false)
  const [recipientInfo, setRecipientInfo] = useState<{ found: boolean, level: number, currentPlanId: string | null } | null>(null)
  const [isCheckingRecipient, setIsCheckingRecipient] = useState(false)

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
    setPromoError(null)
    try {
      const res = await fetch(`/api/promos/validate?code=${encodeURIComponent(promoCode.trim())}&planId=${encodeURIComponent(plan.id)}&months=${months}&isGift=${isGift ? '1' : '0'}`)
      const data = await res.json()
      if (data.promo) {
        setAppliedPromo(data.promo)
        setPromoError(null)
      } else {
        setPromoError(data.error || 'Ошибка проверки')
      }
    } catch (e) {
      setPromoError('Сервис недоступен')
    }
    setIsValidating(false)
  }

  const basePrice = plan.price * months
  
  // Phase 6 Discount Logic
  let systemDiscount = 0
  let discountLabel = ''
  
  if (isGift) {
    systemDiscount = 0.15 // 15% for gifts
    discountLabel = 'Скидка на подарок 15%'
  } else if (months >= 3) {
    systemDiscount = 0.10 // 10% for 3+ months
    discountLabel = 'Оптом дешевле: -10%'
  }

  const priceAfterSystemDiscount = Math.floor(basePrice * (1 - systemDiscount))
  const activePromo = appliedPromo || autoPromo
  const finalPrice = activePromo
    ? (activePromo.type === 'percent'
        ? Math.floor(priceAfterSystemDiscount * (1 - activePromo.value / 100))
        : Math.max(0, priceAfterSystemDiscount - activePromo.value))
    : priceAfterSystemDiscount

  const handlePay = async () => {
    if (!method || !plan) return
    setStep('processing')
    setPromoError(null)
    
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
          receiverUsername: isGift ? receiverUsername.trim() : null
        })
      })
      const data = await res.json()
      
      if (data.success && data.paymentUrl) {
        // Redirect to YooMoney
        window.location.href = data.paymentUrl
      } else if (data.success && data.subscription) {
        // Fallback for immediate success if enabled
        setStep('success')
        setAppliedPromo(data.subscription)
      } else {
        setStep('method')
        setPromoError(data.error || 'Ошибка платежа')
      }
    } catch (e) {
      setStep('method')
      setPromoError('Ошибка сети')
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
        <p className="mt-6 text-lg font-semibold text-foreground">Обработка платежа...</p>
        <p className="mt-2 text-sm text-muted-foreground">Подождите, это займёт несколько секунд</p>
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
    <div className="min-h-screen px-4 pb-24 pt-6">
      <button
        onClick={() => onNavigate('plans')}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к тарифам
      </button>

      {/* Order summary */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Заказ</h2>
          {isGift && (
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
              <Gift className="h-3 w-3" />
              ПОДАРОК
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="font-bold text-foreground">{plan.name}</p>
            <p className="text-xs text-muted-foreground">
              {plan.devicesCount} {plan.devicesCount === 1 ? 'устройство' : plan.devicesCount < 5 ? 'устройства' : 'устройств'} &middot; {plan.speedLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-foreground">{finalPrice} {'\u20BD'}</p>
            {(appliedPromo || systemDiscount > 0) && (
              <p className="text-[10px] text-primary line-through">{basePrice} {'\u20BD'}</p>
            )}
            <p className="text-xs text-muted-foreground">{months === 1 ? plan.period : `за ${months} мес.`}</p>
          </div>
        </div>

        {systemDiscount > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 border border-primary/20">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] font-bold text-primary uppercase tracking-tight">
              {discountLabel}: -{Math.round(systemDiscount * 100)}%
          </p>
        </div>
        )}
      </div>

      {/* Receiver Input (Only if Gift) */}
      {isGift && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-foreground">Кому подарок?</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <input
                type="text"
                value={receiverUsername}
                onChange={(e) => setReceiverUsername(e.target.value.replace(/^@/, ''))}
                placeholder="username_друга"
                className="w-full rounded-lg border border-border bg-card px-8 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none transition-all"
            />
            {isCheckingRecipient && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
          
          {recipientInfo?.found && (
            <div className="rounded-lg bg-orange-500/10 p-2 border border-orange-500/20">
              <p className="text-[10px] text-orange-400">
                {recipientInfo.level >= ['scout', 'guardian', 'fortress', 'citadel'].indexOf(plan.id) 
                  ? `Внимание: У @${receiverUsername} уже есть тариф ${recipientInfo.currentPlanId?.toUpperCase()}.`
                  : `У игрока тариф ${recipientInfo.currentPlanId?.toUpperCase()}. Ваш подарок улучшит его.`}
              </p>
            </div>
          )}

          {recipientInfo?.found && recipientInfo.level >= ['scout', 'guardian', 'fortress', 'citadel'].indexOf(plan.id) && (
            <button
               onClick={() => setIsPreOrder(!isPreOrder)}
               className={cn(
                 "flex items-center gap-2 rounded-lg border p-2 transition-all",
                 isPreOrder ? "border-primary bg-primary/10" : "border-border bg-card"
               )}
            >
              <div className={cn("h-4 w-4 rounded border flex items-center justify-center", isPreOrder ? "bg-primary border-primary" : "border-border")}>
                {isPreOrder && <Check className="h-3 w-3 text-white" />}
              </div>
              <p className="text-[10px] font-bold text-foreground">Оформить как предзаказ</p>
            </button>
          )}

          <p className="text-[10px] text-muted-foreground leading-tight">
            {isPreOrder 
              ? "Подарок будет активирован автоматически сразу после окончания текущей подписки друга."
              : "Укажите юзернейм получателя, чтобы он сразу увидел подарок. Если оставить пустым — вы получите код."}
          </p>
        </div>
      </div>
      )}

      {/* Duration Selection */}
      <h2 className="mb-3 mt-6 text-sm font-bold text-muted-foreground">Период оплаты</h2>
      <div className="grid grid-cols-4 gap-2">
        {[1, 3, 6, 12].map(m => (
          <button
            key={m}
            onClick={() => setMonths(m)}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border p-2 transition-all",
              months === m 
                ? "border-primary bg-primary/10 text-primary" 
                : "border-border bg-card text-muted-foreground hover:bg-secondary"
            )}
          >
            <p className="text-lg font-bold">{m}</p>
            <p className="text-[10px] font-medium uppercase">мес</p>
          </button>
        ))}
      </div>

      {/* Gift Toggle in Payment View */}
      <div className="mt-4">
        <button
          onClick={() => setIsGift(!isGift)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl border p-4 transition-all",
            isGift ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-primary/20"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              isGift ? "bg-primary text-white" : "bg-primary/10 text-primary"
            )}>
              <Gift className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-foreground">Купить в подарок</p>
              <p className="text-[9px] text-muted-foreground">Создать код активации (+15% скидка)</p>
            </div>
          </div>
          <div className={cn(
            "h-5 w-9 rounded-full p-1 transition-colors duration-200",
            isGift ? "bg-primary" : "bg-secondary"
          )}>
            <div className={cn(
              "h-3 w-3 rounded-full bg-white transition-transform duration-200",
              isGift ? "translate-x-4" : "translate-x-0"
            )} />
          </div>
        </button>
      </div>

      {/* Promo Code Section */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">Промокод</p>
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="Ввести код"
            disabled={!!appliedPromo}
            className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={appliedPromo ? () => { setAppliedPromo(null); setPromoCode(''); setPromoError(null) } : handleApplyPromo}
            disabled={isValidating || (!promoCode && !appliedPromo)}
            className={cn(
              'rounded-lg px-4 py-2 text-xs font-bold transition-all',
              appliedPromo
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : (appliedPromo ? 'Удалить' : 'Ок')}
          </button>
        </div>
        {promoError && (
          <p className="mt-1.5 text-[10px] text-destructive">{promoError}</p>
        )}
        {appliedPromo && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-medium text-primary">
              Скидка применена: {appliedPromo.type === 'percent' ? `-${appliedPromo.value}%` : `-${appliedPromo.value} руб`}
            </p>
          </div>
        )}
        {!appliedPromo && autoPromo && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-medium text-primary">
              Автоакция активна: {autoPromo.type === 'percent' ? `-${autoPromo.value}%` : `-${autoPromo.value} руб`}
            </p>
          </div>
        )}
      </div>
      {/* Payment methods */}
      <h2 className="mb-3 mt-6 text-sm font-bold text-muted-foreground">Способ оплаты</h2>
      <div className="space-y-2">
        {PAYMENT_METHODS.map((pm) => {
          return (
            <div
              key={pm.id}
              className="flex w-full items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-sm transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                {pm.image ? (
                  <img src={pm.image} alt={pm.label} className="h-8 w-8 object-contain" />
                ) : (
                  pm.icon && <pm.icon className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="text-left">
                <p className="text-base font-bold text-foreground">
                  {pm.label}
                </p>
                <p className="text-xs text-muted-foreground">{pm.description}</p>
              </div>
              <div className="ml-auto rounded-full bg-primary/10 px-3 py-1">
                <p className="text-[10px] font-bold text-primary">ВЫБРАНО</p>
              </div>
            </div>
          )
        })}
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

        // Validation for recipient
        if (isGift && recipientInfo?.found) {
          if (recipientInfo.level >= selectedLevel && !isPreOrder) {
            disabled = true
            reason = 'Такой тариф уже есть'
          }
        }

        return (
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={handlePay}
              disabled={!method || disabled}
              className={cn(
                'w-full rounded-xl py-3.5 text-sm font-semibold transition-all',
                method && !disabled
                  ? 'bg-primary text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/20'
                  : 'cursor-not-allowed bg-secondary text-muted-foreground'
              )}
            >
              {disabled ? reason : `Оплатить ${finalPrice} \u20BD`}
            </button>
            {disabled && (
              <p className="text-center text-[10px] text-destructive font-medium">
                Чтобы сменить текущий тариф на другой, подождите окончания текущей подписки или купите его в подарок.
              </p>
            )}
          </div>
        )
      })()}

      <button 
        onClick={() => onNavigate('documents')}
        className="mt-6 flex w-full items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-foreground">Правовая информация</p>
            <p className="text-[10px] text-muted-foreground">Оферта и политика конфиденциальности</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )
}
