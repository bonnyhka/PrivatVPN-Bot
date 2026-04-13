'use client'

import { useState, useEffect } from 'react'
import { 
  ArrowLeft, Activity, Globe, Zap, Server, 
  TrendingUp, RefreshCw, AlertTriangle
} from 'lucide-react'
import { 
  AreaChart, Area, LineChart, Line, Tooltip, ResponsiveContainer, YAxis
} from 'recharts'
import type { AppView } from '@/lib/types'
import { getStartOfAppDay, getStartOfAppHour } from '@/lib/day-boundary'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface AdminInfoViewProps {
  onNavigate: (view: AppView) => void
}

function getHealthBadge(status?: string) {
  switch (status) {
    case 'stable':
      return 'bg-green-500/12 text-green-400 border-green-500/20'
    case 'attention':
      return 'bg-yellow-500/12 text-yellow-400 border-yellow-500/20'
    case 'degraded':
      return 'bg-orange-500/12 text-orange-400 border-orange-500/20'
    case 'critical':
    case 'offline':
      return 'bg-red-500/12 text-red-400 border-red-500/20'
    default:
      return 'bg-secondary text-muted-foreground border-border'
  }
}

function formatDiagnosticsAge(value?: string | null) {
  if (!value) return 'нет данных'

  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'нет данных'

  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000))
  if (minutes < 2) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`

  const hours = Math.round(minutes / 60)
  return `${hours} ч назад`
}

function formatMetricNumber(value: number | null | undefined, suffix = '') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--'
  return `${value.toFixed(value >= 100 ? 0 : 1)}${suffix}`
}

function getDisplayDiagnosticPing(loc: any) {
  const diagnosticPing = loc?.diagnostics?.pingTarget?.avgMs
  if (typeof diagnosticPing === 'number' && Number.isFinite(diagnosticPing)) {
    return Math.round(diagnosticPing)
  }
  return typeof loc?.ping === 'number' ? loc.ping : 0
}

function getLatencyTargetLabel(loc: any) {
  return loc?.diagnostics?.pingTargetLabel || loc?.diagnostics?.targetLabel || '--'
}

function getLatencyTargetHost(loc: any) {
  return loc?.diagnostics?.pingTargetHost || loc?.diagnostics?.targetHost || '--'
}

function getBandwidthTargetLabel(loc: any) {
  return loc?.diagnostics?.bandwidthTargetLabel || loc?.diagnostics?.targetLabel || '--'
}

function getBandwidthTargetHost(loc: any) {
  return loc?.diagnostics?.bandwidthTargetHost || loc?.diagnostics?.targetHost || '--'
}

function formatBytes(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size.toFixed(size >= 100 || index === 0 ? 0 : 1)} ${units[index]}`
}

function formatLiveSpeedRate(value: number | null | undefined) {
  const mbps = Number(value || 0)
  if (!Number.isFinite(mbps) || mbps <= 0) return '0 КБ/с'
  if (mbps < 0.01) return `${(mbps * 1024).toFixed(1)} КБ/с`
  return `${mbps.toFixed(2)} МБ/с`
}

function getChartDomainMax(dataMax: number) {
  if (!Number.isFinite(dataMax) || dataMax <= 0) return 1
  return Math.max(Math.ceil(dataMax * 1.15), 1)
}

function formatChartHour(value?: string | null) {
  if (!value) return 'нет данных'
  const timestamp = new Date(value)
  if (!Number.isFinite(timestamp.getTime())) return 'нет данных'
  return format(timestamp, 'd MMM, HH:00', { locale: ru })
}

function formatTrafficCheckedAt(value?: string | null) {
  if (!value) return 'нет данных'
  const timestamp = new Date(value)
  if (!Number.isFinite(timestamp.getTime())) return 'нет данных'
  return `обновлено в ${format(timestamp, 'HH:mm', { locale: ru })}`
}

function getCurrentHourStart() {
  return getStartOfAppHour().getTime()
}

function getCompletedHourlyHistory(history?: Array<{ timestamp: string; bytes: number; totalBytes?: number }>) {
  if (!Array.isArray(history)) return []
  const currentHourStart = getCurrentHourStart()
  return history
    .filter((entry) => {
      const ts = new Date(entry.timestamp).getTime()
      return Number.isFinite(ts) && ts < currentHourStart
    })
    .slice(-24)
}

function getNodeTodayTrafficFromHistory(history?: Array<{ timestamp: string; bytes: number }>) {
  const completed = getCompletedHourlyHistory(history)
  const startOfDayTs = getStartOfAppDay().getTime()

  return completed.reduce((total, entry) => {
    const ts = new Date(entry.timestamp).getTime()
    if (!Number.isFinite(ts) || ts < startOfDayTs) return total
    return total + Number(entry.bytes || 0)
  }, 0)
}

function getNodeTodayTraffic(loc: any, history?: Array<{ timestamp: string; bytes: number }>) {
  if (loc?.diagnostics?.accountedTraffic) {
    return Number(loc.diagnostics.accountedTraffic.todayBytes || 0)
  }
  const todayBytes = Number(loc?.diagnostics?.vpnTraffic?.todayBytes || 0)
  if (todayBytes > 0) return todayBytes
  return getNodeTodayTrafficFromHistory(history)
}

function getRecentNetworkHistory(
  history?: Array<{
    timestamp: string
    pingTargetAvgMs?: number | null
    packetLossPct?: number | null
    iperfSenderMbps?: number | null
    iperfReceiverMbps?: number | null
    retransmits?: number | null
    mtrAvgMs?: number | null
    mtrWorstMs?: number | null
    mtrLossPct?: number | null
  }>
) {
  if (!Array.isArray(history)) return []
  return history
    .filter((entry) => entry && entry.timestamp)
    .slice(-72)
}

function formatNetworkPointTime(value?: string | null) {
  if (!value) return 'нет данных'
  const timestamp = new Date(value)
  if (!Number.isFinite(timestamp.getTime())) return 'нет данных'
  return format(timestamp, 'd MMM, HH:mm', { locale: ru })
}

export function AdminInfoView({ onNavigate }: AdminInfoViewProps) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [liveSpeed, setLiveSpeed] = useState<{rx: number, tx: number}>({ rx: 0, tx: 0 })
  const [liveSpeedByLocation, setLiveSpeedByLocation] = useState<Record<string, { rx: number; tx: number }>>({})

  async function loadData() {
    try {
      const [aRes, lRes] = await Promise.all([
        fetch('/api/admin/analytics', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/locations', { cache: 'no-store' }).then(r => r.json())
      ])
      
      if (!aRes.error) setAnalytics(aRes)
      if (Array.isArray(lRes)) setLocations(lRes)
    } catch (e) {
      console.error('Failed to load admin data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function fetchLiveSpeed() {
      try {
        const res = await fetch('/api/admin/network-speed', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setLiveSpeed({ rx: data.totalRxMBps || 0, tx: data.totalTxMBps || 0 })
          const byLocation = Object.entries(data.locations || {}).reduce<Record<string, { rx: number; tx: number }>>(
            (acc, [locId, value]) => {
              const speed = value as { rxMBps?: number; txMBps?: number }
              acc[locId] = {
                rx: Number(speed.rxMBps || 0),
                tx: Number(speed.txMBps || 0),
              }
              return acc
            },
            {}
          )
          setLiveSpeedByLocation(byLocation)
        }
      } catch (e) {
        // ignore
      }
    }
    fetchLiveSpeed()
    const int = setInterval(fetchLiveSpeed, 2000)
    return () => clearInterval(int)
  }, [])

  if (loading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Загрузка данных...</p>
      </div>
    )
  }

  const degradationThresholds = locations.find((loc) => loc.degradationThresholds)?.degradationThresholds
  const trafficCheckedAtLabel = formatTrafficCheckedAt(analytics?.trafficCheckedAt)

  return (
    <div className="flex flex-col gap-6 px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => onNavigate('admin')}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Диагностика сети</h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Техническая аналитика узлов</p>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card/50 p-4 backdrop-blur-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 mb-3">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-foreground">{formatBytes(analytics?.todayTraffic || 0)}</p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Трафик за сегодня</p>
          <p className="mt-1 text-[9px] text-muted-foreground">{trafficCheckedAtLabel}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card/50 p-4 backdrop-blur-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 mb-3">
            <Globe className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-foreground">{formatBytes(analytics?.totalTraffic || 0)}</p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Всего трафика</p>
          <p className="mt-1 text-[9px] text-muted-foreground">{trafficCheckedAtLabel}</p>
        </div>
      </div>

      {/* Traffic History */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest">Накопительный трафик</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Показывает суммарный рост трафика за последние 24 часа.</p>
          </div>
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics?.chartData || []}>
              <defs>
                <linearGradient id="colorTrafficBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <YAxis hide domain={[0, getChartDomainMax]} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const point = payload[0]?.payload
                  return (
                    <div className="rounded-xl border border-border bg-black px-3 py-2 shadow-xl">
                      <p className="text-[10px] text-muted-foreground">{formatChartHour(point?.timestamp)}</p>
                      <p className="mt-1 text-xs font-bold text-white">
                        Накоплено: {formatBytes(point?.bytes || 0)}
                      </p>
                      <p className="text-[10px] text-sky-300">
                        За час: {formatBytes(point?.deltaBytes || 0)}
                      </p>
                    </div>
                  )
                }}
              />
              <Area 
                type="natural" 
                dataKey="bytes" 
                stroke="#38bdf8" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorTrafficBlue)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Servers Load */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-1 flex items-center gap-2">
          <Server className="h-3 w-3" /> Состояние узлов
        </h2>
        <div className="flex flex-col gap-3">
          {locations.map((loc) => {
            const rawNodeTrafficHistory = Array.isArray(loc.diagnostics?.accountedTraffic?.history)
              ? loc.diagnostics.accountedTraffic.history
              : Array.isArray(loc.diagnostics?.vpnTraffic?.history)
                ? loc.diagnostics.vpnTraffic.history
              : []
            const nodeTrafficHistory = getCompletedHourlyHistory(rawNodeTrafficHistory)
            const nodeTodayTraffic = getNodeTodayTraffic(loc, rawNodeTrafficHistory)
            const networkHistory = getRecentNetworkHistory(loc.diagnostics?.networkHistory)
            const latestNetworkPoint = networkHistory[networkHistory.length - 1]
            return (
              <div key={loc.id} className="rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/50 p-2 ring-1 ring-border/50">
                      {loc.flag && loc.flag.length === 2 ? (
                        <img 
                          src={`https://flagcdn.com/${loc.flag.toLowerCase()}.svg`} 
                          alt={loc.country}
                          className="h-full w-full rounded-sm object-cover shadow-sm"
                        />
                      ) : (
                        <span className="text-2xl">{loc.flag}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{loc.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">{loc.host}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "h-2 w-2 rounded-full animate-pulse",
                        loc.load > 80 ? "bg-red-500" : loc.load > 50 ? "bg-yellow-500" : "bg-emerald-500"
                      )} />
                      <span className="text-xs font-black">{loc.load}%</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Загрузка CPU</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-yellow-500" />
                    <div>
                      <p className="text-sm font-black">{loc.ping} <span className="text-[10px] font-normal opacity-50">ms</span></p>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Задержка</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <div className="text-right">
                      <p className="text-sm font-black">{formatBytes(nodeTodayTraffic)}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Трафик узла за сегодня</p>
                    </div>
                  </div>
                </div>

                {/* Load progress bar */}
                <div className="mt-4 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      loc.load > 80 ? "bg-red-500" : loc.load > 50 ? "bg-yellow-500" : "bg-primary"
                    )}
                    style={{ width: `${Math.max(2, loc.load)}%` }}
                  />
                </div>

                <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      История трафика узла
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {nodeTrafficHistory.length > 0 ? 'последние 24 часа' : 'ожидаем историю'}
                    </p>
                  </div>

                  {nodeTrafficHistory.length > 0 ? (
                    <div className="mt-3 h-16 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={nodeTrafficHistory}>
                          <defs>
                            <linearGradient id={`nodeTraffic-${loc.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <YAxis hide domain={[0, getChartDomainMax]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '10px' }}
                            itemStyle={{ color: '#fff', fontSize: '11px' }}
                            labelStyle={{ color: '#9ca3af', fontSize: '10px' }}
                            labelFormatter={(value) => formatChartHour(typeof value === 'string' ? value : undefined)}
                            formatter={(val: number) => [formatBytes(val), 'Трафик']}
                          />
                          <Area
                            type="natural"
                            dataKey="bytes"
                            stroke="#38bdf8"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#nodeTraffic-${loc.id})`}
                            animationDuration={900}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                      История трафика этой ноды накопится после нескольких циклов диагностики.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
            <Activity className="h-3 w-3" /> Сетевая диагностика
          </h2>
        </div>

        {degradationThresholds && (
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
              Границы деградации
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Потери от {degradationThresholds.packetLoss.degraded}%,
              ` iperf ` ниже {degradationThresholds.iperfSender.degraded} Мбит/с,
              ` MTR avg ` от {degradationThresholds.mtrAvg.degraded} мс,
              а нагрузка учитывается только как вторичный фактор вместе с диагностикой и доступностью входов.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {locations.map((loc) => {
            const networkHistory = getRecentNetworkHistory(loc.diagnostics?.networkHistory)
            const latestNetworkPoint = networkHistory[networkHistory.length - 1]
            const nodeLiveSpeed = liveSpeedByLocation[loc.id] || { rx: 0, tx: 0 }

            return (
            <div key={`diag-${loc.id}`} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-secondary/50 ring-1 ring-border/50">
                    {loc.flag && loc.flag.length === 2 ? (
                      <img
                        src={`https://flagcdn.com/${loc.flag.toLowerCase()}.svg`}
                        alt={loc.country}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">{loc.flag}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{loc.name}</p>
                      <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-semibold', getHealthBadge(loc.healthStatus))}>
                        {loc.healthLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-mono text-muted-foreground">{loc.host}</p>
                    <p className="mt-1 text-[10px] text-primary/80">
                      Пинг: {getLatencyTargetLabel(loc)} • Скорость: {getBandwidthTargetLabel(loc)} • {formatDiagnosticsAge(loc.diagnostics?.checkedAt)}
                    </p>
                    <p className="mt-0.5 text-[10px] font-mono text-muted-foreground/80">
                      Цели: {getLatencyTargetHost(loc)} • {getBandwidthTargetHost(loc)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-black text-foreground">{getDisplayDiagnosticPing(loc)} мс</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">score {loc.healthScore ?? 0}</p>
                </div>
              </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-secondary/35 p-2.5">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Нагрузка</p>
                    <p className="mt-1 text-xs font-bold text-foreground">{loc.load}%</p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">{loc.capacityLabel}</p>
                  </div>
                  <div className="rounded-xl bg-secondary/35 p-2.5">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Проверка</p>
                    <p className="mt-1 text-xs font-bold text-foreground">{loc.freshnessLabel}</p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">обновлено по расписанию</p>
                  </div>
                </div>

              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Раздача узла (live)</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-sky-400">RX {formatLiveSpeedRate(nodeLiveSpeed.rx)}</span>
                    <span className="text-[10px] font-bold text-cyan-400">TX {formatLiveSpeedRate(nodeLiveSpeed.tx)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-border bg-secondary/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Сетевая диагностика
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {loc.diagnostics?.checkedAt ? formatDiagnosticsAge(loc.diagnostics.checkedAt) : 'ожидаем замер'}
                  </span>
                </div>

                {loc.diagnostics ? (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-card/70 p-2.5">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">iperf отправка</p>
                        <p className="mt-1 text-xs font-bold text-foreground">
                          {formatMetricNumber(loc.diagnostics?.iperf?.senderMbps, ' Мбит/с')}
                        </p>
                        <p className="mt-0.5 text-[9px] text-muted-foreground">
                          цель {getBandwidthTargetLabel(loc)} • ретраи {formatMetricNumber(loc.diagnostics?.iperf?.retransmits)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-card/70 p-2.5">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">iperf приём</p>
                        <p className="mt-1 text-xs font-bold text-foreground">
                          {formatMetricNumber(loc.diagnostics?.iperf?.receiverMbps, ' Мбит/с')}
                        </p>
                        <p className="mt-0.5 text-[9px] text-muted-foreground">
                          цель {getBandwidthTargetLabel(loc)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-card/70 p-2.5">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Потери пакетов</p>
                        <p className="mt-1 text-xs font-bold text-foreground">
                          {formatMetricNumber(loc.diagnostics?.pingTarget?.lossPct, '%')}
                        </p>
                        <p className="mt-0.5 text-[9px] text-muted-foreground">
                          ping до {getLatencyTargetLabel(loc)} {formatMetricNumber(loc.diagnostics?.pingTarget?.avgMs, ' мс')}
                        </p>
                      </div>

                      <div className="rounded-xl bg-card/70 p-2.5">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Маршрут MTR</p>
                        <p className="mt-1 text-xs font-bold text-foreground">
                          avg {formatMetricNumber(loc.diagnostics?.mtr?.avgMs, ' мс')}
                        </p>
                        <p className="mt-0.5 text-[9px] text-muted-foreground">
                          worst {formatMetricNumber(loc.diagnostics?.mtr?.worstMs, ' мс')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] text-muted-foreground">
                      <span className="rounded-full border border-border bg-card/60 px-2 py-1">
                        ping до {getLatencyTargetLabel(loc)} {formatMetricNumber(loc.diagnostics?.pingTarget?.avgMs, ' мс')}
                      </span>
                      <span className="rounded-full border border-border bg-card/60 px-2 py-1">
                        MTR loss {formatMetricNumber(loc.diagnostics?.mtr?.lossPct, '%')}
                      </span>
                      <span className="rounded-full border border-border bg-card/60 px-2 py-1">
                        скорость {getBandwidthTargetLabel(loc)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                    Для этой локации ещё нет свежего снимка `iperf3 / ping / mtr`.
                  </p>
                )}
              </div>

              <div className="mt-3 rounded-2xl border border-border bg-secondary/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    История сети
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {networkHistory.length > 1 ? 'последние 24 часа' : 'ожидаем накопление'}
                  </span>
                </div>

                {networkHistory.length > 0 ? (
                  <>
                    <div className="mt-3 h-32 w-full rounded-xl border border-border/50 bg-card/30 overflow-hidden p-2">
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={networkHistory}>
                           <YAxis yAxisId="speed" orientation="left" hide domain={[0, 'auto']} />
                           <YAxis yAxisId="ping" orientation="right" hide domain={[0, 'auto']} />
                           <Tooltip
                             content={({ active, payload }) => {
                               if (!active || !payload || !payload.length) return null
                               const data = payload[0].payload
                               return (
                                 <div className="rounded-lg border border-border/70 bg-black/95 p-2 shadow-xl backdrop-blur-md">
                                   <p className="mb-1.5 text-[10px] font-bold text-muted-foreground border-b border-white/10 pb-1">
                                     {formatNetworkPointTime(data?.timestamp)}
                                   </p>
                                   <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px]">
                                     <div className="text-cyan-400/80">Up: <span className="font-black text-cyan-50">{formatMetricNumber(data?.iperfSenderMbps)}</span></div>
                                     <div className="text-sky-400/80">Down: <span className="font-black text-sky-50">{formatMetricNumber(data?.iperfReceiverMbps)}</span></div>
                                     <div className="text-emerald-400/80">Ping: <span className="font-black text-emerald-50">{formatMetricNumber(data?.pingTargetAvgMs)}</span></div>
                                     <div className="text-rose-400/80">Loss: <span className="font-black text-rose-50">{data?.packetLossPct || 0}%</span></div>
                                   </div>
                                 </div>
                               )
                             }}
                           />
                           <Line 
                             yAxisId="speed" 
                             type="monotone" 
                             dataKey="iperfSenderMbps" 
                             stroke="#38bdf8" 
                             strokeWidth={2} 
                             dot={false}
                             activeDot={{ r: 4, fill: "#38bdf8", strokeWidth: 0 }}
                           />
                           <Line 
                             yAxisId="ping" 
                             type="monotone" 
                             dataKey="pingTargetAvgMs" 
                             stroke="#10b981" 
                             strokeWidth={2} 
                             dot={false}
                             activeDot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                           />
                         </LineChart>
                       </ResponsiveContainer>
                     </div>

                    <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px]">
                      <div className="rounded-lg bg-cyan-500/10 py-1.5 border border-cyan-500/20">
                        <span className="text-cyan-500/80 block text-[8px] uppercase font-bold truncate">Отдача</span>
                        <span className="font-bold text-cyan-400">{formatMetricNumber(latestNetworkPoint?.iperfSenderMbps, ' Мбит')}</span>
                      </div>
                      <div className="rounded-lg bg-sky-500/10 py-1.5 border border-sky-500/20">
                        <span className="text-sky-500/80 block text-[8px] uppercase font-bold truncate">Приём</span>
                        <span className="font-bold text-sky-400">{formatMetricNumber(latestNetworkPoint?.iperfReceiverMbps, ' Мбит')}</span>
                      </div>
                      <div className="rounded-lg bg-emerald-500/10 py-1.5 border border-emerald-500/20">
                        <span className="text-emerald-500/80 block text-[8px] uppercase font-bold truncate">Ping</span>
                        <span className="font-bold text-emerald-400">{formatMetricNumber(latestNetworkPoint?.pingTargetAvgMs, ' мс')}</span>
                      </div>
                      <div className="rounded-lg bg-rose-500/10 py-1.5 border border-rose-500/20">
                        <span className="text-rose-500/80 block text-[8px] uppercase font-bold truncate">Потери</span>
                        <span className="font-bold text-rose-400">{latestNetworkPoint?.packetLossPct || 0}%</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                    История сетевых метрик накопится после нескольких циклов `iperf / ping / mtr`.
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <div className="rounded-xl bg-secondary/35 px-3 py-2 text-[10px] text-muted-foreground">
                  Входы:
                  {' '}
                  {(loc.checks || []).map((check: any) => `${check.label} ${check.isUp ? 'OK' : 'DOWN'}`).join(' · ') || 'нет данных'}
                </div>
              </div>

              {loc.healthReasons?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                  {loc.healthReasons.map((reason: string) => (
                    <span key={`${loc.id}-${reason}`}>• {reason}</span>
                  ))}
                </div>
              )}

              {(loc.healthStatus === 'degraded' || loc.healthStatus === 'critical' || loc.healthStatus === 'offline') && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-orange-500/20 bg-orange-500/8 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Эта локация сейчас требует внимания. Смотри в первую очередь на потери, `iperf`, `MTR` и доступность входов.
                  </p>
                </div>
              )}
            </div>
          )})}
        </div>
      </div>
    </div>
  )
}
