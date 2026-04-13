'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Headset,
  Loader2,
  ReceiptText,
} from 'lucide-react'
import type { AppView, User } from '@/lib/types'
import { PLANS } from '@/lib/store'
import { AnimatedContainer, AnimatedItem } from '@/components/ui/animated-view'
import { PaymentHistory } from './payment-history'
import { MyVpnManageCard } from './my-vpn-manage-card'
import { useTelegramUser } from './providers/telegram-provider'

interface MyVpnViewProps {
  user: User
  onNavigate: (view: AppView) => void
}



export function MyVpnView({ user, onNavigate }: MyVpnViewProps) {
  const { refreshUser } = useTelegramUser()
  const [copied, setCopied] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const sub = user.subscription
  const plan = PLANS.find((item) => item.id === sub?.planId)

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
      const response = await fetch('/api/user/subscription/reset-key', {
        method: 'PATCH',
      })
      if (response.ok) {
        await refreshUser()
        setShowResetConfirm(false)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsResetting(false)
    }
  }

  if (!sub || sub.status !== 'active') {
    return (
      <AnimatedContainer className="app-screen-shell min-h-screen px-4 pb-24 pt-6">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <AnimatedItem>
            <div className="grain-surface rounded-[28px] border border-border/80 bg-card/95 p-6 text-center shadow-[0_24px_70px_-50px_rgba(0,0,0,0.9)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-black text-foreground">Подписка не активна</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Подключите тариф, чтобы получить ключ и управление VPN в этой вкладке.
              </p>
              <button
                onClick={() => onNavigate('plans')}
                className="mt-5 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
              >
                Выбрать тариф
              </button>
            </div>
          </AnimatedItem>
        </div>
      </AnimatedContainer>
    )
  }

  return (
    <AnimatedContainer className="app-screen-shell min-h-screen px-4 pb-24 pt-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <AnimatedItem>
          <div className="grain-surface relative overflow-hidden rounded-[26px] border border-border/80 bg-card/95 p-5 shadow-[0_24px_60px_-45px_rgba(0,0,0,0.85)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(120,130,255,0.09),transparent_48%)]" />
            <img
              src="/images/vpn-hero.gif"
              alt=""
              className="pointer-events-none absolute -right-4 top-1/2 h-[75%] w-[36%] -translate-y-1/2 object-contain opacity-85"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-[66%]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                    Подписка PrivatVPN
                  </p>
                  <h1 className="mt-2 text-lg font-bold text-foreground">Мой VPN</h1>
                  <p className="mt-1 text-xs text-muted-foreground">Управляйте подключением и ключами</p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedItem>

        <AnimatedItem>
          <MyVpnManageCard
            plan={plan}
            subscription={sub}
            copied={copied}
            onCopy={handleCopy}
            onConnect={() => onNavigate('connect')}
            onReset={() => setShowResetConfirm(true)}
            isResetting={isResetting}
          />
        </AnimatedItem>

        <AnimatedItem className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onNavigate('plans')}
            className="grain-surface rounded-2xl border border-border/80 bg-card/95 p-4 text-left transition-all hover:border-primary/30"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ReceiptText className="h-4 w-4" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">Сменить тариф</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Обновить план подписки</p>
          </button>

          <button
            onClick={() => onNavigate('support')}
            className="grain-surface rounded-2xl border border-border/80 bg-card/95 p-4 text-left transition-all hover:border-primary/30"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Headset className="h-4 w-4" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">Поддержка</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Поможем с настройкой</p>
          </button>
        </AnimatedItem>

        <AnimatedItem className="pb-4">
          <div className="grain-surface rounded-[24px] border border-border/80 bg-card/95 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">История оплат</p>
                <p className="text-[11px] text-muted-foreground">Последние транзакции по подписке</p>
              </div>
              <div className="rounded-full border border-border bg-secondary/40 px-2 py-1 text-[10px] text-muted-foreground">
                Лента
              </div>
            </div>
            <PaymentHistory onNavigate={onNavigate} />
          </div>
        </AnimatedItem>
      </div>

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
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Текущие настройки VPN на устройствах перестанут работать, потребуется новый ключ.
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
    </AnimatedContainer>
  )
}
