'use client'

import { useState } from 'react'
import { ArrowLeft, CreditCard, Smartphone, Wallet, CheckCircle2, Loader2, Copy, Check } from 'lucide-react'
import type { Plan, AppView } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PaymentViewProps {
  plan: Plan | null
  onNavigate: (view: AppView) => void
}

type PaymentMethod = 'card' | 'sbp' | 'crypto'
type PaymentStep = 'method' | 'processing' | 'success'

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: typeof CreditCard; description: string }[] = [
  { id: 'card', label: 'Банковская карта', icon: CreditCard, description: 'Visa, MasterCard, МИР' },
  { id: 'sbp', label: 'СБП', icon: Smartphone, description: 'Система быстрых платежей' },
  { id: 'crypto', label: 'Криптовалюта', icon: Wallet, description: 'USDT, TON, BTC' },
]

export function PaymentView({ plan, onNavigate }: PaymentViewProps) {
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [step, setStep] = useState<PaymentStep>('method')
  const [copied, setCopied] = useState(false)

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

  const handlePay = () => {
    setStep('processing')
    // Simulate payment processing
    setTimeout(() => {
      setStep('success')
    }, 2500)
  }

  const handleCopyKey = () => {
    navigator.clipboard.writeText('vless://demo-key@ghostvpn.io:443?type=ws&security=tls')
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
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/20 bg-primary/10 glow-green">
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
              vless://demo-key@ghostvpn.io:443
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
        <h2 className="text-sm font-medium text-muted-foreground">Заказ</h2>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="font-bold text-foreground">{plan.name}</p>
            <p className="text-xs text-muted-foreground">
              {plan.devicesCount} {plan.devicesCount === 1 ? 'устройство' : plan.devicesCount < 5 ? 'устройства' : 'устройств'} &middot; {plan.speedLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-foreground">{plan.price} {'\u20BD'}</p>
            <p className="text-xs text-muted-foreground">{plan.period}</p>
          </div>
        </div>
      </div>

      {/* Payment methods */}
      <h2 className="mb-3 mt-6 text-sm font-medium text-muted-foreground">Способ оплаты</h2>
      <div className="space-y-2">
        {PAYMENT_METHODS.map((pm) => {
          const Icon = pm.icon
          const isSelected = method === pm.id
          return (
            <button
              key={pm.id}
              onClick={() => setMethod(pm.id)}
              className={cn(
                'flex w-full items-center gap-4 rounded-xl border p-4 transition-all',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/30'
              )}
            >
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                isSelected ? 'bg-primary/15' : 'bg-secondary'
              )}>
                <Icon className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div className="text-left">
                <p className={cn('text-sm font-medium', isSelected ? 'text-foreground' : 'text-foreground')}>
                  {pm.label}
                </p>
                <p className="text-xs text-muted-foreground">{pm.description}</p>
              </div>
              <div className={cn(
                'ml-auto h-5 w-5 rounded-full border-2 transition-colors',
                isSelected ? 'border-primary bg-primary' : 'border-border'
              )}>
                {isSelected && <Check className="h-full w-full p-0.5 text-primary-foreground" />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={!method}
        className={cn(
          'mt-6 w-full rounded-xl py-3.5 text-sm font-semibold transition-all',
          method
            ? 'bg-primary text-primary-foreground hover:brightness-110'
            : 'cursor-not-allowed bg-secondary text-muted-foreground'
        )}
      >
        Оплатить {plan.price} {'\u20BD'}
      </button>

      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        Нажимая кнопку, вы соглашаетесь с условиями сервиса
      </p>
    </div>
  )
}
