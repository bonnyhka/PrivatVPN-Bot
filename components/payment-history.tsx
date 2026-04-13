'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard, Check, Clock, TrendingUp,
  Loader2, CheckCircle2, XCircle, AlertCircle, X, ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { AppView } from '@/lib/types'

const PLAN_LABELS: Record<string, string> = {
  scout: 'Scout',
  guardian: 'Guardian',
  fortress: 'Fortress',
  citadel: 'Citadel',
}

const PLAN_COLORS: Record<string, string> = {
  scout: 'text-slate-400',
  guardian: 'text-primary',
  fortress: 'text-violet-400',
  citadel: 'text-amber-400',
}

interface Payment {
  id: string
  planId: string
  amount: number
  months: number
  status: string
  promoCode: string | null
  createdAt: string
}

interface PaymentHistoryProps {
  onNavigate?: (view: AppView) => void
}

export function PaymentHistory({ onNavigate }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  useEffect(() => {
    fetch('/api/payments/history')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPayments(data)
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Загрузка истории...</span>
      </div>
    )
  }

  if (error || payments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <CreditCard className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Оплат пока не было</p>
        <p className="mt-1 text-xs text-muted-foreground/60">История платежей появится после первой попытки оплаты</p>
      </div>
    )
  }

  const successPayments = payments.filter(p => p.status === 'success' || p.status === 'paid' || p.status === 'completed')
  const total = successPayments.reduce((sum, p) => sum + p.amount, 0)

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
      case 'success':
        return { icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10', label: 'Оплачено' }
      case 'pending':
        return { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'В ожидании' }
      case 'failed':
      case 'canceled':
      case 'expired':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Отменено' }
      default:
        return { icon: AlertCircle, color: 'text-muted-foreground', bg: 'bg-secondary', label: status }
    }
  }

  return (
    <>
      <div className="space-y-3">
        {/* Summary */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Потрачено всего</span>
            </div>
            <span className="text-lg font-extrabold text-foreground">{total} ₽</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{payments.length} {payments.length === 1 ? 'платёж (все статусы)' : 'платежей (все статусы)'}</p>
        </div>

        {/* List (Single Panel) */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {payments.map((p, idx) => {
            const date = new Date(p.createdAt)
            const label = PLAN_LABELS[p.planId] || p.planId
            const color = PLAN_COLORS[p.planId] || 'text-foreground'
            const sDisplay = getStatusDisplay(p.status)
            const StatusIcon = sDisplay.icon

            return (
              <button
                key={p.id}
                onClick={() => setSelectedPayment(p)}
                className={cn(
                  "flex w-full items-center gap-3 bg-card p-4 text-left transition-colors hover:bg-secondary/50",
                  idx !== payments.length - 1 && "border-b border-border"
                )}
              >
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", sDisplay.bg)}>
                  <StatusIcon className={cn("h-4 w-4", sDisplay.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-sm font-bold', color)}>{label}</span>
                    <span className="text-xs text-muted-foreground">· {p.months} {p.months === 1 ? 'мес' : 'мес'}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className={cn("font-medium", sDisplay.color)}>{sDisplay.label}</span>
                    <span className="opacity-50">·</span>
                    <span>{date.toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
                <span className={cn("shrink-0 text-base font-extrabold", p.status === 'pending' ? 'text-foreground/70' : 'text-foreground')}>
                  {p.amount} ₽
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Transaction Details Modal */}
      <AnimatePresence>
        {selectedPayment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
              className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedPayment(null)}
                className="absolute right-4 top-4 p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col items-center">
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-full mb-3", getStatusDisplay(selectedPayment.status).bg)}>
                  {selectedPayment.status === 'success' || selectedPayment.status === 'paid' || selectedPayment.status === 'completed' ? (
                    <CheckCircle2 className={cn("h-6 w-6", getStatusDisplay(selectedPayment.status).color)} />
                  ) : selectedPayment.status === 'pending' ? (
                    <Clock className={cn("h-6 w-6", getStatusDisplay(selectedPayment.status).color)} />
                  ) : (
                    <XCircle className={cn("h-6 w-6", getStatusDisplay(selectedPayment.status).color)} />
                  )}
                </div>
                <h3 className="text-2xl font-black text-foreground">{selectedPayment.amount} ₽</h3>
                <p className={cn("mt-1 text-sm font-medium", getStatusDisplay(selectedPayment.status).color)}>
                  {getStatusDisplay(selectedPayment.status).label}
                </p>
              </div>

              <div className="mt-6 space-y-3 rounded-2xl bg-secondary/30 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Тариф</span>
                  <span className="font-semibold text-foreground">{PLAN_LABELS[selectedPayment.planId] || selectedPayment.planId} ({selectedPayment.months} мес)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Дата</span>
                  <span className="font-medium text-foreground">{new Date(selectedPayment.createdAt).toLocaleString('ru-RU')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Транзакция ID</span>
                  <span className="font-mono text-xs text-foreground bg-secondary/50 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                    {selectedPayment.id}
                  </span>
                </div>
                {selectedPayment.promoCode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Промокод</span>
                    <span className="font-mono text-primary font-medium">{selectedPayment.promoCode}</span>
                  </div>
                )}
              </div>

              {selectedPayment.status === 'pending' && onNavigate && (
                <button
                  onClick={() => {
                    setSelectedPayment(null)
                    onNavigate('plans')
                  }}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Перейти к оплате
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
