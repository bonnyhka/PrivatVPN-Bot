'use client'

import { useState, useEffect } from 'react'
import {
  Users, Key, Headphones, Activity,
  UserPlus, BarChart3, Tag, DollarSign, Server, Globe,
  CheckCircle2, RefreshCw, Package, Sparkles, Shield
} from 'lucide-react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { AppView } from '@/lib/types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { AnimatedContainer, AnimatedItem } from '@/components/ui/animated-view'

interface AdminViewProps {
  onNavigate: (view: AppView) => void
}

export function AdminView({ onNavigate }: AdminViewProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<any>({ 
    totalUsers: 0, 
    activeKeys: 0, 
    openTickets: 0,
    monthlyRevenue: 0,
    monthlyTraffic: 0,
    newUsers30d: 0 
  })
  const [locations, setLocations] = useState<any[]>([])
  const [chartsData, setChartsData] = useState({ revenue: [], users: [] })
  const [analytics, setAnalytics] = useState<any>(null)
  const [settings, setSettings] = useState<{ globalNotification?: string }>({ globalNotification: '' })
  const [savingSettings, setSavingSettings] = useState(false)

  function loadData() {
    fetch('/api/admin/stats').then(r => r.json()).then(d => {
      if (!d.error) setStats(d)
    }).catch(console.error)

    fetch('/api/locations').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setLocations(d)
    }).catch(console.error)

    fetch('/api/admin/charts').then(r => r.json()).then(d => {
      if (!d.error) setChartsData(d)
    }).catch(console.error)

    fetch('/api/admin/analytics').then(r => r.json()).then(d => {
      if (!d.error) setAnalytics(d)
    }).catch(console.error)

    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      if (!d.error) setSettings(d)
    }).catch(console.error)
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
    } catch (e) {
      console.error(e)
    } finally {
      setSavingSettings(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  function handleRefresh() {
    setRefreshing(true)
    loadData()
    setTimeout(() => setRefreshing(false), 800)
  }

  const formatTraffic = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024**2) return (bytes / 1024).toFixed(2) + ' KB'
    if (bytes < 1024**3) return (bytes / 1024**2).toFixed(2) + ' MB'
    if (bytes < 1024**4) return (bytes / 1024**3).toFixed(3) + ' GB'
    return (bytes / 1024**4).toFixed(3) + ' TB'
  }

  const formatTrafficCheckedAt = (value?: string | null) => {
    if (!value) return undefined
    const timestamp = new Date(value)
    if (!Number.isFinite(timestamp.getTime())) return undefined
    return `обновлено в ${format(timestamp, 'HH:mm', { locale: ru })}`
  }

  const statCards = [
    { label: 'Оборот (30д)', value: stats.monthlyRevenue ? stats.monthlyRevenue.toLocaleString() + ' ₽' : '0 ₽', icon: DollarSign },
    { label: 'Всего трафика', value: formatTraffic(analytics?.totalTraffic || 0), icon: Globe, subValue: formatTrafficCheckedAt(analytics?.trafficCheckedAt) },
    { label: 'Юзеры', value: stats.totalUsers || 0, icon: Users },
    { label: 'Тикеты', value: stats.openTickets || 0, icon: Headphones },
  ]

  const adminSections: { view: AppView; label: string; description: string; icon: typeof Users; count?: number }[] = [
    { view: 'admin-info', label: 'Диагностика сети', description: 'iperf, MTR, потери, входы и health узлов', icon: Activity, count: locations.length },
    { view: 'admin-locations', label: 'Управление серверами', description: 'Добавление и развертывание узлов', icon: Globe, count: locations.length },
    { view: 'admin-users', label: 'Пользователи', description: 'Управление ролями и аккаунтами', icon: Users, count: stats.totalUsers },
    { view: 'admin-keys', label: 'VPN ключи', description: 'Выдача и управление ключами', icon: Key, count: stats.activeKeys },
    { view: 'admin-pricing', label: 'Тарифы и цены', description: 'Управление ценами и функциями', icon: DollarSign, count: 4 },
    { view: 'admin-security', label: 'Безопасность', description: 'Логи, лимиты и события безопасности', icon: Shield },
    { view: 'admin-discounts', label: 'Скидки', description: 'Промокоды и акции', icon: Tag },
    { view: 'admin-routers', label: 'VPN Роутеры', description: 'Подготовка и прошивка устройств', icon: Server },
    { view: 'admin-orders', label: 'Заказы роутеров', description: 'Управление продажами и доставкой', icon: Package },
    { view: 'admin-support', label: 'Поддержка', description: 'Тикеты и назначение агентов', icon: Headphones, count: stats.openTickets },
  ]

  // Removed old chart section

  return (
    <AnimatedContainer className="min-h-screen px-4 pb-24 pt-6">
      {/* Header */}
      <AnimatedItem className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Админ панель</h1>
            <p className="text-xs text-muted-foreground">PrivatVPN</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:border-primary/30"
        >
          <RefreshCw className={cn('h-4 w-4 text-muted-foreground', refreshing && 'animate-spin text-primary')} />
        </button>
      </AnimatedItem>

      {/* Stats grid */}
      <AnimatedItem className="mt-6 grid grid-cols-2 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">
                {stat.label}
                {stat.subValue && <span className="ml-1 text-primary/70">• {stat.subValue}</span>}
              </p>
            </div>
          )
        })}
      </AnimatedItem>

      {/* Settings */}
      <AnimatedItem className="mt-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-1">
        <div className="rounded-xl border border-white/5 bg-card/50 p-4 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-primary/30">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Push-Уведомление (hApp)</h2>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Эксклюзивный нативный popup-alert для пользователей hApp</p>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
              settings.globalNotification ? "bg-green-500/10 text-green-500" : "bg-secondary text-muted-foreground"
            )}>
              <span className="relative flex h-2 w-2">
                {settings.globalNotification && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>}
                <span className={cn("relative inline-flex h-2 w-2 rounded-full", settings.globalNotification ? "bg-green-500" : "bg-muted-foreground/40")}></span>
              </span>
              {settings.globalNotification ? "Активно" : "Выключено"}
            </div>
          </div>
          
          <div className="flex gap-2 relative">
            <input
              type="text"
              placeholder="Введите текст системного уведомления для hApp..."
              value={settings.globalNotification || ''}
              onChange={(e) => setSettings({ ...settings, globalNotification: e.target.value })}
              className="flex-1 rounded-xl border border-primary/20 bg-background/50 p-3 pl-4 text-xs font-medium text-foreground placeholder-muted-foreground/50 transition-all focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
            <button
              disabled={savingSettings}
              onClick={handleSaveSettings}
              className="group relative flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-primary/40 focus:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {savingSettings ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Activity className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:rotate-12" />
                  Применить
                </>
              )}
            </button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[9px] text-muted-foreground/70 text-center justify-center">
            Оставьте поле пустым и нажмите «Применить», чтобы отключить рассылку уведомления.
          </p>
        </div>
      </AnimatedItem>

      {/* Servers section */}
      <AnimatedItem className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Server className="h-4 w-4 text-primary" />
            Серверы
          </h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {locations.length} локаций
          </span>
        </div>

        {locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-8 text-center">
            <Globe className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs font-medium text-muted-foreground">Серверов пока нет</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground/60">Добавьте серверы через API</p>
          </div>
        ) : (
          <div className="space-y-2">
            {locations.map((loc: any) => (
              <div key={loc.id || loc.host || loc.name} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/50 p-1.5 ring-1 ring-border/50">
                    {loc.flag && loc.flag.length === 2 ? (
                      <img 
                        src={`https://flagcdn.com/w80/${loc.flag.toLowerCase()}.png`} 
                        alt={loc.country}
                        className="h-full w-full rounded-sm object-cover shadow-sm"
                      />
                    ) : (
                      <span className="text-sm font-bold">{loc.flag}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{loc.country}</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="font-mono font-semibold text-primary">{loc.ping} мс</span>
                      <span>Нагрузка: {loc.load}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-semibold text-foreground">{loc.load}%</span>
                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          loc.load < 50 ? 'bg-primary' : loc.load < 75 ? 'bg-yellow-400' : 'bg-orange-400'
                        )}
                        style={{ width: `${loc.load}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {/* Ping Chart */}
            <div className="rounded-xl border border-border bg-card p-4 mt-2">
              <p className="mb-4 text-xs font-semibold text-muted-foreground">Ринг серверов (мс)</p>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={locations}>
                    <XAxis dataKey="country" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--secondary))' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '12px' }}
                    />
                    <Bar dataKey="ping" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </AnimatedItem>

      {/* Sections */}
      <AnimatedItem>
        <h2 className="mb-3 mt-6 text-sm font-medium text-muted-foreground">Управление</h2>
      </AnimatedItem>
      <AnimatedItem className="space-y-2">
        {adminSections.map((section) => {
          const Icon = section.icon
          return (
            <button
              key={section.view}
              onClick={() => onNavigate(section.view)}
              className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">{section.label}</p>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
              {section.count !== undefined && (
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-foreground">
                  {section.count}
                </span>
              )}
            </button>
          )
        })}
      </AnimatedItem>

      {/* Quick actions */}
      <AnimatedItem>
        <h2 className="mb-3 mt-6 text-sm font-medium text-muted-foreground">Быстрые действия</h2>
      </AnimatedItem>
      <AnimatedItem className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('admin-keys')}
          className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30"
        >
          <UserPlus className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Выдать ключ</span>
        </button>
        <button
          onClick={() => onNavigate('admin-users')}
          className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30"
        >
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Пользователи</span>
        </button>
        <button
          disabled={refreshing}
          onClick={async () => {
            setRefreshing(true)
            const res = await fetch('/api/user/gift/test-trigger', { method: 'POST' })
            if (res.ok) {
              setRefreshing(false)
              onNavigate('home')
            } else {
              setRefreshing(false)
            }
          }}
          className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          {refreshing ? (
            <RefreshCw className="h-4 w-4 text-primary animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          )}
          <span className="text-xs font-bold text-primary">
            {refreshing ? 'Создание...' : 'Тестовый подарок (Анимация)'}
          </span>
        </button>
      </AnimatedItem>
    </AnimatedContainer>
  )
}
