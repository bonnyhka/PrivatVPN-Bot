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
      ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20'
      : tone === 'blue'
        ? 'bg-primary/15 text-primary ring-primary/20'
        : 'bg-white/[0.07] text-foreground/70 ring-white/10'

  const valueColor =
    tone === 'green' ? 'text-emerald-300' : tone === 'blue' ? 'text-primary' : 'text-foreground'

  return (
    <div className="grain-surface relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1', iconBg)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className={cn('mt-3 text-2xl font-black tracking-tight', valueColor)}>{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
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
          <div className="relative border-b border-white/8 px-5 pb-6 pt-6 sm:px-6 sm:pt-7">
            {/* Glow accent */}
            <div className="pointer-events-none absolute left-0 top-0 h-40 w-64 rounded-full bg-primary/8 blur-3xl" />

            <div className="grain-surface relative rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] px-4 py-5 sm:px-5">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                <TrendingUp className="h-3 w-3" />
                Финансы
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Финансовая сводка</h2>
              <p className="mt-1 text-sm text-muted-foreground">Выручка и история оплат за выбранный период</p>

              {/* Date range + Button */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">С</span>
                    <input
                      type="month"
                      value={draftFromMonth}
                      onChange={(e) => setDraftFromMonth(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/50 focus:bg-white/[0.08]"
                    />
                  </div>
                  <div className="mt-5 text-muted-foreground">→</div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">По</span>
                    <input
                      type="month"
                      value={draftToMonth}
                      onChange={(e) => setDraftToMonth(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/50 focus:bg-white/[0.08]"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFromMonth(draftFromMonth)
                    setToMonth(draftToMonth)
                    void load(draftFromMonth, draftToMonth)
                  }}
                  disabled={loading}
                  className={cn(
                    'flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-110 active:scale-[0.98] sm:min-w-[180px]',
                    loading && 'opacity-60'
                  )}
                >
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                  Обновить
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-4 px-5 pb-6 pt-5 sm:px-6 sm:pb-7">

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
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
              <StatCard
                label="Средний чек"
                value={formatRub(totals.averageCheck)}
                hint="за период"
                icon={Wallet}
              />
              <StatCard
                label="Провайдеры"
                value={String(providerRows.length || 0)}
                hint="источников оплаты"
                icon={CreditCard}
              />
            </div>

            {/* Chart */}
            <div className="grain-surface rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-sm font-bold text-foreground">История по месяцам</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Оборот и крипто-платежи за выбранный диапазон</p>
              <div className="mt-4 h-44 sm:h-52">
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

            {/* Two cols: providers + recent payments */}
            <div className="grid gap-4 lg:grid-cols-2">

              {/* Providers */}
              <div className="grain-surface rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-sm font-bold text-foreground">Разбивка по платёжкам</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Выручка по источникам за период</p>
                <div className="mt-3 space-y-2">
                  {providerRows.length > 0 ? providerRows.map((provider: any) => (
                    <div
                      key={provider.providerId}
                      className="grain-surface flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{provider.label}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {provider.count} платежей{provider.isCrypto ? ' · крипто' : ''}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-extrabold text-foreground">{formatRub(provider.revenue)}</p>
                    </div>
                  )) : (
                    <div className="grain-surface rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-muted-foreground">
                      Нет подтверждённых оплат за период.
                    </div>
                  )}
                </div>
              </div>

              {/* Recent payments */}
              <div className="grain-surface rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-sm font-bold text-foreground">Последние платежи</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Свежие поступления</p>
                <div className="mt-3 space-y-2">
                  {recentPayments.length > 0 ? recentPayments.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="grain-surface flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{payment.user?.displayName || 'user'}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>{payment.planId} · {payment.months}м</span>
                          <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] text-foreground/70">
                            {payment.providerLabel}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-extrabold text-foreground">{formatRub(payment.amount)}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {String(payment.createdAt || '').slice(0, 10)}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="grain-surface rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-muted-foreground">
                      Пока пусто.
                    </div>
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
