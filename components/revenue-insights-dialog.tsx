'use client'

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { BarChart3, Coins, CreditCard, RefreshCw, Wallet, TrendingUp, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

function formatRub(value: number) {
  return `${Math.round(value || 0).toLocaleString('ru-RU')} ₽`
}

function getMonthValue(date = new Date()) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const next = new Date(Date.UTC(year, monthNumber - 1 + offset, 1))
  return getMonthValue(next)
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string
  hint: string
  icon: any
  tone?: 'default' | 'blue' | 'green'
}) {
  const iconBg =
    tone === 'green'
      ? 'bg-emerald-500/15 text-emerald-400'
      : tone === 'blue'
        ? 'bg-primary/15 text-primary'
        : 'bg-white/[0.07] text-foreground/70'

  const valueColor =
    tone === 'green' ? 'text-emerald-300' : tone === 'blue' ? 'text-primary' : 'text-foreground'

  return (
    <div className="flex items-center gap-3">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className={cn('text-lg font-bold tracking-tight', valueColor)}>{value}</p>
        <p className="text-[10px] text-muted-foreground/70">{hint}</p>
      </div>
    </div>
  )
}

export function RevenueInsightsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [fromMonth, setFromMonth] = useState(() => shiftMonth(getMonthValue(), -5))
  const [toMonth, setToMonth] = useState(() => getMonthValue())
  const [draftFromMonth, setDraftFromMonth] = useState(fromMonth)
  const [draftToMonth, setDraftToMonth] = useState(toMonth)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  async function load(rangeFrom = fromMonth, rangeTo = toMonth) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ from: rangeFrom, to: rangeTo })
      const res = await fetch(`/api/admin/revenue-insights?${params.toString()}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!json.error) setData(json)
    } catch (error) {
      console.error('Failed to load revenue insights:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    void load()
  }, [open])

  const providerRows = data?.providers || []
  const recentPayments = data?.recentPayments || []
  const monthlyData = data?.monthly || []
  const totals = data?.totals || {
    totalRevenue: 0,
    cryptoRevenue: 0,
    cryptoShare: 0,
    successfulCount: 0,
    averageCheck: 0,
  }

  const cryptoHint = useMemo(() => {
    if (!totals.totalRevenue) return 'пока без поступлений'
    return `${Math.round(totals.cryptoShare || 0)}% от оборота`
  }, [totals.totalRevenue, totals.cryptoShare])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl p-2 text-foreground sm:w-[calc(100vw-2rem)] sm:p-3">
        <div className="grain-surface-strong max-h-[90vh] overflow-y-auto rounded-[28px] border border-white/10 bg-[#0a0d16] shadow-[0_40px_120px_rgba(0,0,0,0.7)] backdrop-blur-2xl">

          {/* Header */}
          <div className="relative px-5 pb-4 pt-5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Финансы</h2>
                  <p className="text-xs text-muted-foreground">Выручка и история оплат</p>
                </div>
              </div>
            </div>

            {/* Date range inline */}
            <div className="mt-4 flex items-center gap-2">
              <input
                type="month"
                value={draftFromMonth}
                onChange={(e) => setDraftFromMonth(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 text-xs text-foreground outline-none transition focus:border-primary/40"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <input
                type="month"
                value={draftToMonth}
                onChange={(e) => setDraftToMonth(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 text-xs text-foreground outline-none transition focus:border-primary/40"
              />
              <button
                onClick={() => {
                  setFromMonth(draftFromMonth)
                  setToMonth(draftToMonth)
                  void load(draftFromMonth, draftToMonth)
                }}
                disabled={loading}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:brightness-110 active:scale-95',
                  loading && 'opacity-60'
                )}
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-3 px-5 pb-5 sm:px-6">

            {/* Stats grid */}
            <div className="grain-surface rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label="Оборот"
                  value={formatRub(totals.totalRevenue)}
                  hint={`${totals.successfulCount || 0} платежей`}
                  icon={BarChart3}
                  tone="blue"
                />
                <StatCard
                  label="Крипто"
                  value={formatRub(totals.cryptoRevenue)}
                  hint={cryptoHint}
                  icon={Coins}
                  tone="green"
                />
              </div>
              <div className="my-3 border-t border-white/6" />
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label="Средний чек"
                  value={formatRub(totals.averageCheck)}
                  hint="за период"
                  icon={Wallet}
                />
                <StatCard
                  label="Провайдеры"
                  value={String(providerRows.length || 0)}
                  hint="источников"
                  icon={CreditCard}
                />
              </div>
            </div>

            {/* Chart */}
            <div className="grain-surface rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-xs font-semibold text-foreground">История по месяцам</p>
              <div className="mt-3 h-36 sm:h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="revenueTotalFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="revenueCryptoFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                    <Tooltip
                      cursor={{ stroke: 'rgba(255,255,255,0.08)' }}
                      contentStyle={{
                        backgroundColor: 'rgba(8,10,20,0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        color: 'white',
                        fontSize: 12,
                      }}
                      formatter={(value: any, name: any) => [
                        formatRub(Number(value || 0)),
                        name === 'crypto' ? 'Крипта' : 'Оборот',
                      ]}
                    />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revenueTotalFill)" />
                    <Area type="monotone" dataKey="crypto" stroke="#34d399" strokeWidth={1.5} fill="url(#revenueCryptoFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Providers + Recent payments */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Providers */}
              <div className="grain-surface rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                <p className="text-xs font-semibold text-foreground">Провайдеры</p>
                <div className="mt-2 space-y-1.5">
                  {providerRows.length > 0 ? providerRows.map((provider: any) => (
                    <div
                      key={provider.providerId}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{provider.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {provider.count} платежей
                        </p>
                      </div>
                      <p className="shrink-0 text-xs font-bold text-foreground">{formatRub(provider.revenue)}</p>
                    </div>
                  )) : (
                    <p className="py-2 text-xs text-muted-foreground">Нет данных</p>
                  )}
                </div>
              </div>

              {/* Recent payments */}
              <div className="grain-surface rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                <p className="text-xs font-semibold text-foreground">Последние платежи</p>
                <div className="mt-2 space-y-1.5">
                  {recentPayments.length > 0 ? recentPayments.slice(0, 4).map((payment: any) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{payment.user?.displayName || 'user'}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {payment.planId} · {payment.providerLabel}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs font-bold text-foreground">{formatRub(payment.amount)}</p>
                    </div>
                  )) : (
                    <p className="py-2 text-xs text-muted-foreground">Пока пусто</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
