'use client'

import { useState, useEffect } from 'react'
import {
  Users, Key, Headphones, ShieldCheck, Activity, TrendingUp,
  UserPlus, BarChart3, MessageSquare, Gift, Server, Wifi,
  ArrowUp, ArrowDown, Gauge, Clock, Zap, Globe, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, Tag
} from 'lucide-react'
import type { AppView } from '@/lib/types'
import { MOCK_USERS, MOCK_VPN_KEYS, MOCK_TICKETS, MOCK_REFERRALS, LOCATIONS, MOCK_DISCOUNTS } from '@/lib/store'
import { cn } from '@/lib/utils'

interface AdminViewProps {
  onNavigate: (view: AppView) => void
}

interface ServerStatus {
  country: string
  flag: string
  ping: number
  load: number
  upload: number
  download: number
  status: 'online' | 'warning' | 'offline'
  users: number
  uptime: string
}

export function AdminView({ onNavigate }: AdminViewProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [serverStatuses, setServerStatuses] = useState<ServerStatus[]>(() =>
    LOCATIONS.map((loc) => ({
      ...loc,
      upload: Math.floor(Math.random() * 400 + 100),
      download: Math.floor(Math.random() * 800 + 200),
      status: loc.load > 60 ? 'warning' as const : 'online' as const,
      users: Math.floor(Math.random() * 150 + 10),
      uptime: `${Math.floor(Math.random() * 30 + 1)}д ${Math.floor(Math.random() * 24)}ч`,
    }))
  )

  const [liveMetrics, setLiveMetrics] = useState({
    avgPing: 0,
    totalBandwidth: 0,
    activeConnections: 0,
    totalUpload: 0,
    totalDownload: 0,
  })

  useEffect(() => {
    function recalc() {
      const onlineServers = serverStatuses.filter(s => s.status !== 'offline')
      setLiveMetrics({
        avgPing: Math.round(onlineServers.reduce((a, s) => a + s.ping, 0) / onlineServers.length),
        totalBandwidth: onlineServers.reduce((a, s) => a + s.download, 0),
        activeConnections: onlineServers.reduce((a, s) => a + s.users, 0),
        totalUpload: onlineServers.reduce((a, s) => a + s.upload, 0),
        totalDownload: onlineServers.reduce((a, s) => a + s.download, 0),
      })
    }
    recalc()
  }, [serverStatuses])

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setServerStatuses(prev => prev.map(s => ({
        ...s,
        ping: Math.max(5, s.ping + Math.floor(Math.random() * 7 - 3)),
        load: Math.min(99, Math.max(5, s.load + Math.floor(Math.random() * 9 - 4))),
        upload: Math.max(50, s.upload + Math.floor(Math.random() * 41 - 20)),
        download: Math.max(100, s.download + Math.floor(Math.random() * 61 - 30)),
        users: Math.max(1, s.users + Math.floor(Math.random() * 5 - 2)),
        status: s.load > 80 ? 'warning' as const : 'online' as const,
      })))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  function handleRefresh() {
    setRefreshing(true)
    setTimeout(() => {
      setServerStatuses(prev => prev.map(s => ({
        ...s,
        ping: Math.floor(Math.random() * 150 + 10),
        load: Math.floor(Math.random() * 70 + 10),
        upload: Math.floor(Math.random() * 400 + 100),
        download: Math.floor(Math.random() * 800 + 200),
        users: Math.floor(Math.random() * 150 + 10),
      })))
      setRefreshing(false)
    }, 1200)
  }

  const FLAG_EMOJIS: Record<string, string> = {
    NL: '\uD83C\uDDF3\uD83C\uDDF1',
    DE: '\uD83C\uDDE9\uD83C\uDDEA',
    FI: '\uD83C\uDDEB\uD83C\uDDEE',
    US: '\uD83C\uDDFA\uD83C\uDDF8',
    JP: '\uD83C\uDDEF\uD83C\uDDF5',
    SG: '\uD83C\uDDF8\uD83C\uDDEC',
  }

  const stats = [
    { label: 'Пользователи', value: MOCK_USERS.length, change: '+12%', icon: Users },
    { label: 'Активные ключи', value: MOCK_VPN_KEYS.filter(k => k.status === 'active').length, change: '+8%', icon: Key },
    { label: 'Тикеты', value: MOCK_TICKETS.filter(t => t.status !== 'resolved').length, change: '-3', icon: Headphones },
    { label: 'Доход/мес', value: '4.2K', change: '+23%', icon: TrendingUp },
  ]

  const activeDiscountsCount = MOCK_DISCOUNTS.filter(d => d.isActive).length

  const adminSections: { view: AppView; label: string; description: string; icon: typeof Users; count?: number }[] = [
    { view: 'admin-users', label: 'Пользователи', description: 'Управление ролями и аккаунтами', icon: Users, count: MOCK_USERS.length },
    { view: 'admin-keys', label: 'VPN ключи', description: 'Выдача и управление ключами', icon: Key, count: MOCK_VPN_KEYS.length },
    { view: 'admin-discounts', label: 'Скидки', description: 'Промокоды и акции', icon: Tag, count: activeDiscountsCount },
    { view: 'admin-support', label: 'Поддержка', description: 'Тикеты и назначение агентов', icon: Headphones, count: MOCK_TICKETS.filter(t => t.status !== 'resolved').length },
    { view: 'admin-admins', label: 'Команда', description: 'Выдача ролей и управление', icon: ShieldCheck, count: MOCK_USERS.filter(u => u.role !== 'user').length },
    { view: 'admin-messages', label: 'Сообщения бота', description: 'Тексты и шаблоны уведомлений', icon: MessageSquare, count: 7 },
  ]

  const onlineCount = serverStatuses.filter(s => s.status === 'online').length
  const warningCount = serverStatuses.filter(s => s.status === 'warning').length
  const offlineCount = serverStatuses.filter(s => s.status === 'offline').length

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
      </div>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className={cn(
                  'text-[10px] font-semibold',
                  stat.change.startsWith('+') ? 'text-primary' : 'text-orange-400'
                )}>
                  {stat.change}
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* System Status */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Server className="h-4 w-4 text-primary" />
            Статус системы
          </h2>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1 text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {onlineCount}
            </span>
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-yellow-400">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                {warningCount}
              </span>
            )}
            {offlineCount > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                {offlineCount}
              </span>
            )}
          </div>
        </div>

        {/* Live metrics bar */}
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Gauge className="h-3.5 w-3.5 text-primary" />
                <span className="text-lg font-bold text-foreground">{liveMetrics.avgPing}</span>
              </div>
              <p className="text-[9px] text-muted-foreground">Ср. пинг (мс)</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Wifi className="h-3.5 w-3.5 text-primary" />
                <span className="text-lg font-bold text-foreground">{liveMetrics.activeConnections}</span>
              </div>
              <p className="text-[9px] text-muted-foreground">Подключений</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-lg font-bold text-foreground">{(liveMetrics.totalBandwidth / 1000).toFixed(1)}</span>
              </div>
              <p className="text-[9px] text-muted-foreground">Гбит/с общий</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ArrowUp className="h-3 w-3 text-primary" />
              <span>{(liveMetrics.totalUpload / 1000).toFixed(1)} Гбит/с</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ArrowDown className="h-3 w-3 text-cyan-400" />
              <span>{(liveMetrics.totalDownload / 1000).toFixed(1)} Гбит/с</span>
            </div>
          </div>
        </div>

        {/* Server list */}
        <div className="mt-3 space-y-2">
          {serverStatuses.map((server) => {
            const pingColor = server.ping < 50 ? 'text-primary' : server.ping < 100 ? 'text-yellow-400' : 'text-orange-400'
            const loadColor = server.load < 50 ? 'bg-primary' : server.load < 75 ? 'bg-yellow-400' : 'bg-orange-400'
            const statusIcon = server.status === 'online'
              ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              : server.status === 'warning'
              ? <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
              : <XCircle className="h-3.5 w-3.5 text-destructive" />

            return (
              <div
                key={server.flag}
                className={cn(
                  'rounded-xl border bg-card p-3 transition-colors',
                  server.status === 'warning' ? 'border-yellow-400/20' : 'border-border'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{FLAG_EMOJIS[server.flag] || server.flag}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{server.country}</span>
                      {statusIcon}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className={cn('font-mono font-semibold', pingColor)}>{server.ping} мс</span>
                      <span className="flex items-center gap-1">
                        <ArrowUp className="h-2.5 w-2.5" />
                        {server.upload} Мбит
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowDown className="h-2.5 w-2.5" />
                        {server.download} Мбит
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-2.5 w-2.5" />
                        {server.users}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-semibold text-foreground">{server.load}%</span>
                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700', loadColor)}
                        style={{ width: `${server.load}%` }}
                      />
                    </div>
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {server.uptime}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Referral stats */}
      <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Реферальная система</span>
          </div>
          <span className="text-xs font-bold text-primary">{MOCK_REFERRALS.length} приглашений</span>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span>Выплачено: {MOCK_REFERRALS.filter(r => r.status === 'credited').length * 30} руб</span>
          <span>Ожидает: {MOCK_REFERRALS.filter(r => r.status === 'pending').length * 30} руб</span>
        </div>
      </div>

      {/* Sections */}
      <h2 className="mb-3 mt-6 text-sm font-medium text-muted-foreground">Управление</h2>
      <div className="space-y-2">
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
      </div>

      {/* Quick actions */}
      <h2 className="mb-3 mt-6 text-sm font-medium text-muted-foreground">Быстрые действия</h2>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('admin-keys')}
          className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30"
        >
          <UserPlus className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Выдать ключ</span>
        </button>
        <button className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Статистика</span>
        </button>
      </div>
    </div>
  )
}
