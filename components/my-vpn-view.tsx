'use client'

import { useState } from 'react'
import { Copy, Check, Clock, Shield, AlertTriangle, Zap, Loader2, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { User, AppView } from '@/lib/types'
import { PLANS } from '@/lib/store'
import { cn } from '@/lib/utils'
import { PaymentHistory } from './payment-history'
import { useTelegramUser } from './providers/telegram-provider'
import { AnimatedContainer, AnimatedItem } from '@/components/ui/animated-view'

interface MyVpnViewProps {
  user: User
  onNavigate: (view: AppView) => void
}

export function MyVpnView({ user, onNavigate }: MyVpnViewProps) {
  const { refreshUser } = useTelegramUser()
  const [copied, setCopied] = useState(false)
  const sub = user.subscription
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const plan = PLANS.find((p) => p.id === sub?.planId)

  const handleCopy = () => {
    if (sub?.subscriptionUrl) {
      navigator.clipboard.writeText(sub.subscriptionUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleResetKey = async () => {
    setIsResetting(true)
    try {
      const res = await fetch('/api/user/subscription/reset-key', {
        method: 'PATCH',
      })
      if (res.ok) {
        await refreshUser()
        setShowResetConfirm(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsResetting(false)
    }
  }

  if (!sub || sub.status !== 'active') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 pb-24">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-secondary">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mt-6 text-lg font-bold text-foreground">Нет активной подписки</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Подключите тариф, чтобы получить VPN ключ
        </p>
        <button
          onClick={() => onNavigate('plans')}
          className="mt-6 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          Выбрать тариф
        </button>
      </div>
    )
  }

  const daysLeft = Math.ceil(
    (new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  return (
    <AnimatedContainer className="min-h-screen px-4 pb-24 pt-6">
      <AnimatedItem>
        <h1 className="text-xl font-bold text-foreground">Мой VPN</h1>
        <p className="mt-1 text-sm text-muted-foreground">Управление подпиской</p>
      </AnimatedItem>

      {/* Active plan card */}
      <AnimatedItem className="mt-6 rounded-2xl border border-primary/30 bg-card p-5 glow-green">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">{plan?.name || 'VPN'}</h3>
              <p className="text-xs text-muted-foreground">{plan?.speedLabel} &middot; {plan?.devicesCount} устр.</p>
            </div>
          </div>
          <div className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            Активен
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Истекает</span>
            </div>
            <p className="text-sm font-bold text-foreground">
              {new Date(sub.expiresAt).toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>

        {/* Days left bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Осталось дней</span>
            <span className="font-semibold text-foreground">{daysLeft}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (daysLeft / 30) * 100)}%` }}
            />
          </div>
        </div>

        {/* Traffic usage bar */}
        {plan && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Трафик ({plan.trafficLimit === Number.MAX_SAFE_INTEGER ? 'Безлимит' : `${Math.round(plan.trafficLimit / (1024**3))} ГБ`})
              </span>
              <span className="font-semibold text-foreground">
                {sub.trafficUsed ? (Number(sub.trafficUsed) / (1024**3)).toFixed(1) : '0'} ГБ
              </span>
            </div>
            {plan.trafficLimit !== Number.MAX_SAFE_INTEGER && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    (Number(sub.trafficUsed || 0) / plan.trafficLimit) > 0.9 ? 'bg-red-500' : 'bg-primary'
                  )}
                  style={{ width: `${Math.min(100, (Number(sub.trafficUsed || 0) / plan.trafficLimit) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => onNavigate('connect')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="h-5 w-5 fill-current" />
            Подключить в приложение
          </button>
          <button
            onClick={handleCopy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 py-4 text-sm font-bold text-primary transition-all hover:bg-primary/11 hover:border-primary/30"
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            {copied ? 'Ключ скопирован' : 'Скопировать ключ'}
          </button>
          
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-medium text-muted-foreground transition-all hover:text-red-400"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isResetting && "animate-spin")} />
            Перевыпустить ключ доступа
          </button>
        </div>
      </AnimatedItem>



      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-xs rounded-3xl border border-border bg-card p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">Сбросить ключ?</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Ваши текущие настройки VPN на всех устройствах перестанут работать. Вам нужно будет скопировать новый ключ.
                </p>
                
                <div className="mt-6 flex w-full flex-col gap-2">
                  <button
                    onClick={handleResetKey}
                    disabled={isResetting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Да, перевыпустить'}
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="w-full rounded-xl bg-secondary py-3 text-sm font-bold text-foreground transition-all hover:bg-secondary/80"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Quick actions */}
      <AnimatedItem className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('plans')}
          className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
        >
          <p className="text-sm font-semibold text-foreground">Сменить тариф</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Обновить план</p>
        </button>
        <button
          onClick={() => onNavigate('support')}
          className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
        >
          <p className="text-sm font-semibold text-foreground">Поддержка</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Помощь 24/7</p>
        </button>
      </AnimatedItem>

      {/* Payment history */}
      <AnimatedItem>
        <h2 className="mb-3 mt-6 text-sm font-medium text-muted-foreground">История оплат</h2>
        <PaymentHistory />
      </AnimatedItem>
    </AnimatedContainer>
  )
}

