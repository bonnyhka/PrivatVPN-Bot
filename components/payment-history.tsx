'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Check, Clock, TrendingUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  createdAt: string
}

export function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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
        <p className="mt-1 text-xs text-muted-foreground/60">История платежей появится после первой оплаты</p>
      </div>
    )
  }

  const total = payments.reduce((sum, p) => sum + p.amount, 0)

  return (
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
        <p className="mt-0.5 text-xs text-muted-foreground">{payments.length} {payments.length === 1 ? 'платёж' : payments.length < 5 ? 'платежа' : 'платежей'}</p>
      </div>

      {/* List */}
      {payments.map(p => {
        const date = new Date(p.createdAt)
        const label = PLAN_LABELS[p.planId] || p.planId
        const color = PLAN_COLORS[p.planId] || 'text-foreground'
        return (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Check className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn('text-sm font-bold', color)}>{label}</span>
                <span className="text-xs text-muted-foreground">· {p.months} {p.months === 1 ? 'мес' : 'мес'}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{date.toLocaleDateString('ru-RU')}</span>
              </div>
            </div>
            <span className="shrink-0 text-base font-extrabold text-foreground">{p.amount} ₽</span>
          </div>
        )
      })}
    </div>
  )
}
