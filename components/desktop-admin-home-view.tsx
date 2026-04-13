'use client'

import { useEffect, useMemo, useState } from 'react'
import { Crown, Flame, RefreshCw, Activity, Globe, Users, Key, HardDrive, CreditCard, BarChart3, Radio, Sparkles } from 'lucide-react'
import type { User } from '@/lib/types'
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts'
import { RevenueInsightsDialog } from '@/components/revenue-insights-dialog'

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)))
  const val = bytes / Math.pow(k, i)
  const fixed = i <= 1 ? 0 : i === 2 ? 1 : 2
  return `${val.toFixed(fixed)} ${sizes[i]}`
}

type AdminStats = {
  totalUsers: number
  activeKeys: number
  openTickets: number
  monthlyRevenue: number
  monthlyTraffic: number
  newUsers30d?: number
}

type AdminAnalytics = {
  totalTraffic: number
  todayTraffic: number
  activeUsers: number
  activeConnections: number
  trafficCheckedAt?: string
}

type LocationRow = {
  id: string
  country?: string
  host?: string
  diagnostics?: any
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string | number
  hint: string
  icon: any
  tone?: 'default' | 'blue' | 'orange'
}) {
  const toneClass =
    tone === 'orange'
      ? 'border-orange-400/15 bg-orange-400/[0.06] text-orange-300'
      : tone === 'blue'
        ? 'border-primary/15 bg-primary/[0.08] text-primary'
        : 'border-white/8 bg-white/[0.03] text-foreground'

  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
        <div className={cx('flex h-10 w-10 items-center justify-center rounded-2xl border', toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{hint}</div>
    </div>
  )
}

export function DesktopAdminHomeView({ user }: { user: User }) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isRevenueDialogOpen, setIsRevenueDialogOpen] = useState(false)

  const greetingName = useMemo(() => {
    const name = (user.displayName || '').trim()
    if (name) return name.split(' ')[0]
    const uname = (user.username || '').trim()
    return uname ? `@${uname}` : 'админ'
  }, [user.displayName, user.username])

  const topToday = useMemo(() => {
    const list = locations
      .map((l) => ({
        id: l.id,
        title: (l.country || '').trim() || l.id,
        bytes: l.diagnostics?.accountedTraffic
          ? Number(l.diagnostics.accountedTraffic.todayBytes || 0)
          : Number(l.diagnostics?.vpnTraffic?.todayBytes || 0),
      }))
      .filter((x) => x.bytes > 0)
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 6)
    return list
  }, [locations])

  async function load() {
    setLoading(true)
    try {
      const [s, a, loc, dash] = await Promise.all([
        fetch('/api/admin/stats', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/admin/analytics', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/locations', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/admin/dashboard', { cache: 'no-store' }).then((r) => r.json()),
      ])

      if (!s?.error) setStats(s)
      if (!a?.error) setAnalytics(a)
      if (Array.isArray(loc)) setLocations(loc)
      if (!dash?.error) setDashboard(dash)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [])

  const avatar = user.avatar

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-14 w-14 overflow-hidden rounded-[20px] border border-white/8 bg-white/[0.04] shadow-lg shadow-black/20">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-extrabold text-muted-foreground">
                  {String((user.displayName || user.username || 'A')[0]).toUpperCase()}
                </div>
              )}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-2xl border border-primary/20 bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                <Crown className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Главная</div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight">Привет, {greetingName}</div>
              <div className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Короткая сводка по сервису, сети и активности за сегодня.
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[460px]">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                Пользователи
              </div>
              <div className="mt-3 text-2xl font-extrabold">{analytics?.activeUsers ?? '—'}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">активны по подпискам</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                <Radio className="h-4 w-4 text-emerald-300" />
                Live
              </div>
              <div className="mt-3 text-2xl font-extrabold">{analytics?.activeConnections ?? '—'}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">активных соединений</div>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className={cx(
                'rounded-2xl border border-primary/15 bg-primary/[0.08] p-4 text-left transition-colors hover:bg-primary/[0.12]',
                loading && 'opacity-60'
              )}
            >
              <div className="text-[11px] uppercase tracking-[0.2em] text-primary/85">
                Обновить
              </div>
              <div className="mt-3 flex items-center gap-2 text-xl font-extrabold">
                <RefreshCw className={cx('h-4 w-4 text-primary', loading && 'animate-spin')} />
                Данные
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">загрузить свежую сводку</div>
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard
          label="Активные пользователи"
          value={analytics?.activeUsers ?? '—'}
          hint="сейчас по подпискам"
          icon={Users}
          tone="blue"
        />
        <KpiCard
          label="Активные соединения"
          value={analytics?.activeConnections ?? '—'}
          hint="за последние минуты"
          icon={Activity}
          tone="default"
        />
        <KpiCard
          label="Активные ключи"
          value={stats?.activeKeys ?? '—'}
          hint="доступы в базе"
          icon={Key}
          tone="default"
        />
        <KpiCard
          label="Трафик сегодня"
          value={formatBytes(analytics?.todayTraffic ?? 0)}
          hint="по логам пользователей"
          icon={HardDrive}
          tone="orange"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold">Трафик за 24 часа</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Суммарно по логам пользователей и синхронизации статистики.</div>
            </div>
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4 h-48 w-full rounded-[24px] border border-white/8 bg-black/20 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={Array.isArray((analytics as any)?.chartData) ? (analytics as any).chartData : []}>
                <defs>
                  <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="timestamp"
                  tick={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--border))' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 12,
                    color: 'hsl(var(--foreground))',
                    fontSize: 12,
                  }}
                  formatter={(v: any, name: any) => (name === 'deltaBytes' ? [formatBytes(Number(v)), 'Δ за час'] : [formatBytes(Number(v)), 'Всего'])}
                  labelFormatter={() => ''}
                />
                <Area type="monotone" dataKey="bytes" stroke="hsl(var(--primary))" fill="url(#trafficFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="text-[11px] text-muted-foreground">Всего трафика</div>
              <div className="mt-1 text-lg font-extrabold">{formatBytes(analytics?.totalTraffic ?? 0)}</div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="text-[11px] text-muted-foreground">Сегодня</div>
              <div className="mt-1 text-lg font-extrabold">{formatBytes(analytics?.todayTraffic ?? 0)}</div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="text-[11px] text-muted-foreground">Обновлено</div>
              <div className="mt-1 text-lg font-extrabold">{analytics?.trafficCheckedAt ? 'OK' : '—'}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{analytics?.trafficCheckedAt || ''}</div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold">Топ пользователей (сегодня)</div>
              <div className="mt-1 text-[11px] text-muted-foreground">По `TrafficLog` за сутки.</div>
            </div>
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4 space-y-2">
            {(dashboard?.topUsersToday || []).slice(0, 6).map((u: any, idx: number) => (
              <div key={u.subscriptionId || idx} className="flex items-center justify-between rounded-[22px] border border-white/8 bg-black/20 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-primary/15 text-[11px] font-extrabold text-primary">{idx + 1}</span>
                    <span className="truncate text-sm font-bold">{u.displayName}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{u.username ? `@${u.username}` : (u.telegramId || '')}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold">{formatBytes(Number(u.bytes || 0))}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">сегодня</div>
                </div>
              </div>
            ))}
            {(!dashboard?.topUsersToday || dashboard.topUsersToday.length === 0) && (
              <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-muted-foreground">Нет данных.</div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold">Топ по трафику узлов (сегодня)</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Данные из диагностики узлов (tc). Обновляется каждые ~20 минут.
              </div>
            </div>
            <Flame className="h-5 w-5 text-orange-400" />
          </div>

          {topToday.length === 0 ? (
            <div className="mt-4 rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-muted-foreground">
              Пока нет данных за сегодня.
            </div>
          ) : (
            <div className="mt-4 grid gap-2 lg:grid-cols-2">
              {topToday.map((row, idx) => (
                <div
                  key={row.id}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-primary/15 text-[11px] font-extrabold text-primary">
                        {idx + 1}
                      </span>
                      <span className="truncate text-sm font-bold">{row.title}</span>
                    </div>
                    <div className="mt-1 truncate text-[11px] text-muted-foreground">узел: {row.id}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-extrabold">{formatBytes(row.bytes)}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">сегодня</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold">Платежи (последние)</div>
              <div className="mt-1 text-[11px] text-muted-foreground">paid/completed за 7 дней.</div>
            </div>
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4 space-y-2">
            {(dashboard?.recentPayments || []).slice(0, 8).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-[22px] border border-white/8 bg-black/20 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{p.user?.displayName || 'user'}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {p.planId} · {p.months}м · {p.providerLabel || 'платёж'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold">{Number(p.amount || 0).toLocaleString()} ₽</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{String(p.createdAt || '').slice(0, 10)}</div>
                </div>
              </div>
            ))}
            {(!dashboard?.recentPayments || dashboard.recentPayments.length === 0) && (
              <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-muted-foreground">Нет данных.</div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold">Сводка</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Ключевые показатели сервиса + топ тарифов.</div>
            </div>
            <Globe className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-6">
            <div className="md:col-span-2 rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="text-[11px] text-muted-foreground">Пользователи</div>
              <div className="mt-1 text-xl font-extrabold">{stats?.totalUsers ?? '—'}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">+{stats?.newUsers30d ?? '—'} за 30 дней</div>
            </div>
            <div className="md:col-span-2 rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="text-[11px] text-muted-foreground">Тикеты (open)</div>
              <div className="mt-1 text-xl font-extrabold">{stats?.openTickets ?? '—'}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">требуют реакции</div>
            </div>
            <button
              type="button"
              onClick={() => setIsRevenueDialogOpen(true)}
              className="md:col-span-2 rounded-[24px] border border-white/8 bg-black/20 p-4 text-left transition-colors hover:border-primary/25 hover:bg-black/25"
            >
              <div className="text-[11px] text-muted-foreground">Оборот (30д)</div>
              <div className="mt-1 text-xl font-extrabold">{(stats?.monthlyRevenue ?? 0).toLocaleString()} ₽</div>
              <div className="mt-1 text-[11px] text-muted-foreground">нажми, чтобы открыть детали по крипте и периодам</div>
            </button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="text-[11px] text-muted-foreground">Трафик (30д)</div>
              <div className="mt-1 text-xl font-extrabold">{formatBytes(stats?.monthlyTraffic ?? 0)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">по traffic logs</div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="text-[11px] text-muted-foreground">Топ тарифов (active)</div>
              <div className="mt-2 space-y-1.5">
                {(dashboard?.activeByPlan || []).slice(0, 4).map((p: any) => (
                  <div key={p.planId} className="flex items-center justify-between text-sm">
                    <span className="font-bold">{p.planId}</span>
                    <span className="text-muted-foreground">{p.count}</span>
                  </div>
                ))}
                {(!dashboard?.activeByPlan || dashboard.activeByPlan.length === 0) && (
                  <div className="text-sm text-muted-foreground">—</div>
                )}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="text-[11px] text-muted-foreground">Топ узлов (today)</div>
              <div className="mt-2 space-y-1.5">
                {(dashboard?.nodeTopToday || []).slice(0, 4).map((n: any) => (
                  <div key={n.id} className="flex items-center justify-between text-sm">
                    <span className="font-bold">{n.id}</span>
                    <span className="text-muted-foreground">{formatBytes(Number(n.bytes || 0))}</span>
                  </div>
                ))}
                {(!dashboard?.nodeTopToday || dashboard.nodeTopToday.length === 0) && (
                  <div className="text-sm text-muted-foreground">—</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <RevenueInsightsDialog open={isRevenueDialogOpen} onOpenChange={setIsRevenueDialogOpen} />
    </div>
  )
}
