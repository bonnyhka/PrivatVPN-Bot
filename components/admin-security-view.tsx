'use client'

import { useState, useEffect } from 'react'
import { Shield, ShieldAlert, ShieldCheck, Activity, AlertTriangle, ShieldX, ArrowLeft, Loader2, RefreshCw, BarChart3, Clock, MapPin } from 'lucide-react'
import { AppView } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AdminSecurityViewProps {
  onNavigate: (view: AppView) => void
}

interface SecurityLog {
  id: string
  type: 'rate_limit' | 'auth_fail' | 'ddos' | 'blocked_ip' | 'invalid_input'
  ip: string
  path: string
  details?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
}

interface TopIp {
  ip: string
  _count: number
}

interface Summary {
  [key: string]: number
}

export function AdminSecurityView({ onNavigate }: AdminSecurityViewProps) {
  const [data, setData] = useState<{ summary: Summary; recentLogs: SecurityLog[]; topIps: TopIp[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/admin/security/stats')
      if (res.ok) {
        const stats = await res.json()
        setData(stats)
      }
    } catch (error) {
      console.error('Failed to fetch security stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, 60000) // update every minute
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-foreground/60 font-medium">Загрузка системы защиты...</p>
      </div>
    )
  }

  const ddosCount = data?.summary['ddos'] || 0
  const rateLimitCount = data?.summary['rate_limit'] || 0
  const totalThreats = Object.values(data?.summary || {}).reduce((a, b) => a + b, 0)

  return (
    <div className="app-screen-shell flex min-h-screen flex-col p-4 pb-24">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('admin')}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-foreground transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Защита Системы</h1>
            <p className="text-xs text-foreground/60">Мониторинг угроз и DDoS атак</p>
          </div>
        </div>
        <button
          onClick={fetchStats}
          disabled={refreshing}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-foreground transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 relative overflow-hidden">
            <ShieldAlert className="absolute -right-2 -bottom-2 h-16 w-16 opacity-10 text-red-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500/60 mb-1">DDoS Атаки</p>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white">{ddosCount}</span>
              <span className="text-[10px] text-red-500/40 font-bold uppercase mt-1">за 24 часа</span>
            </div>
          </div>
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 relative overflow-hidden">
            <Activity className="absolute -right-2 -bottom-2 h-16 w-16 opacity-10 text-yellow-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500/60 mb-1">Заблокировано</p>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white">{rateLimitCount}</span>
              <span className="text-[10px] text-yellow-500/40 font-bold uppercase mt-1">Rate Limit</span>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className={cn(
          "rounded-2xl border p-5 flex items-center gap-4",
          totalThreats > 100 
            ? "border-red-500/30 bg-red-500/5" 
            : totalThreats > 0 
              ? "border-yellow-500/30 bg-yellow-500/5"
              : "border-green-500/30 bg-green-500/5"
        )}>
          <div className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            totalThreats > 100 ? "bg-red-500/20" : totalThreats > 0 ? "bg-yellow-500/20" : "bg-green-500/20"
          )}>
            {totalThreats > 100 ? (
              <ShieldX className="h-6 w-6 text-red-500" />
            ) : totalThreats > 0 ? (
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-green-500" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Статус Защиты: {totalThreats > 100 ? 'Под атакой' : totalThreats > 0 ? 'Повышенный риск' : 'Безопасно'}</h3>
            <p className="text-xs text-white/50">{totalThreats > 0 ? `За последние 24 часа зафиксировано ${totalThreats} подозрительных активностей.` : 'Система работает в штатном режиме, атак не обнаружено.'}</p>
          </div>
        </div>

        {/* Top Offensive IPs */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-black uppercase tracking-widest text-white/70">Топ атак по IP</h2>
          </div>
          <div className="space-y-3">
            {data?.topIps.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/30 italic">Активных атак не зафиксировано</p>
            ) : (
              data?.topIps.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-black/40 p-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-primary/40">#{i+1}</span>
                    <span className="text-xs font-mono font-bold text-white">{item.ip}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">{item._count}</span>
                    <span className="text-[10px] text-white/30 uppercase font-black">попыток</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Logs List */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-black uppercase tracking-widest text-white/70">Недавние события</h2>
          </div>
          <div className="space-y-3">
            {data?.recentLogs.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/30 italic">Журнал событий пуст</p>
            ) : (
              data?.recentLogs.map((log) => (
                <div key={log.id} className="rounded-xl bg-black/40 p-3 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider",
                      log.type === 'ddos' ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500"
                    )}>
                      {log.type === 'ddos' ? 'DDoS Атака' : 'Rate Limit'}
                    </span>
                    <span className="text-[9px] text-white/30 font-bold">
                      {new Date(log.createdAt).toLocaleTimeString('ru-RU')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-mono text-white/60 truncate">{log.ip}</span>
                    <span className="text-[10px] text-primary/60 truncate shrink-0">{log.path}</span>
                  </div>
                  {log.details && (
                    <p className="mt-2 text-[10px] text-white/30 border-t border-white/5 pt-2 italic">
                      {log.details}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
