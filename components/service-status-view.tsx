'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ChevronLeft, 
  Server, 
  Globe, 
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Cpu
} from 'lucide-react'
import type { AppView } from '@/lib/types'

interface StatusNode {
  id: string
  name: string
  type: 'node' | 'service'
  status: 'online' | 'warning' | 'offline'
  uptime?: string
  load?: number
  latency?: number
  flag?: string
}

function FlagIcon({ flag }: { flag?: string }) {
  const code = String(flag || '').trim().toLowerCase()
  if (code.length === 2 && /^[a-z]{2}$/.test(code)) {
    return (
      <img
        src={`https://flagcdn.com/${code}.svg`}
        alt=""
        className="h-full w-full object-cover"
      />
    )
  }

  return (
    <div className="p-2.5">
      <Globe className="h-5 w-5" />
    </div>
  )
}

export interface ServiceStatusViewProps {
  onNavigate: (view: AppView) => void
}

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-4 my-8 first:mt-2">
    <div className="flex-1 h-px bg-white/5" />
    <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/20 italic text-center">{title}</h2>
    <div className="flex-1 h-px bg-white/5" />
  </div>
)

function getAvailabilityPercent(items: StatusNode[]) {
  if (!items.length) return 0
  const onlineCount = items.filter((item) => item.status === 'online').length
  return Number(((onlineCount / items.length) * 100).toFixed(1))
}

function formatPercent(value: number) {
  return `${value.toFixed(value >= 100 ? 0 : 1)}%`
}

function getSummaryState(items: StatusNode[]) {
  const offlineCount = items.filter((item) => item.status === 'offline').length
  const warningCount = items.filter((item) => item.status === 'warning').length

  if (offlineCount > 0) {
    return {
      title: 'Есть критические проблемы',
      message: `${offlineCount} систем(ы) сейчас офлайн. Проверь карточки ниже и последнюю диагностику.`,
      tone: 'critical' as const,
      Icon: AlertTriangle,
    }
  }

  if (warningCount > 0) {
    return {
      title: 'Есть зоны внимания',
      message: `${warningCount} систем(ы) работают с предупреждениями. В целом всё живо, но стоит проверить детали.`,
      tone: 'warning' as const,
      Icon: AlertCircle,
    }
  }

  return {
    title: 'Все системы под контролем',
    message: 'Инфраструктура стабильна. Узлы и core-сервисы отвечают штатно, а uptime обновляется в реальном времени.',
    tone: 'healthy' as const,
    Icon: CheckCircle2,
  }
}

function getSummaryClasses(tone: 'healthy' | 'warning' | 'critical') {
  if (tone === 'critical') {
    return {
      shell: 'border-red-500/20 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.18),transparent_48%),linear-gradient(180deg,rgba(127,29,29,0.22),rgba(15,23,42,0.55))]',
      iconWrap: 'bg-red-500/12 text-red-300 ring-1 ring-red-500/25',
      percent: 'text-red-300',
      soft: 'border-red-500/20 bg-red-500/10 text-red-100',
      accent: 'text-red-200/80',
    }
  }

  if (tone === 'warning') {
    return {
      shell: 'border-amber-500/20 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_48%),linear-gradient(180deg,rgba(120,53,15,0.22),rgba(15,23,42,0.55))]',
      iconWrap: 'bg-amber-500/12 text-amber-200 ring-1 ring-amber-500/25',
      percent: 'text-amber-200',
      soft: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
      accent: 'text-amber-100/75',
    }
  }

  return {
    shell: 'border-emerald-500/20 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_48%),linear-gradient(180deg,rgba(6,78,59,0.22),rgba(15,23,42,0.55))]',
    iconWrap: 'bg-emerald-500/12 text-emerald-200 ring-1 ring-emerald-500/25',
    percent: 'text-emerald-200',
    soft: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-50',
    accent: 'text-emerald-100/75',
  }
}

export function ServiceStatusView({ onNavigate }: ServiceStatusViewProps) {
  const [nodes, setNodes] = useState<StatusNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastCheck, setLastCheck] = useState<string>('')

  const fetchData = async () => {
    try {
      // 1. Fetch Location Data (Nodes)
      let realNodes: StatusNode[] = []
      try {
        const locRes = await fetch('/api/locations')
        if (locRes.ok) {
          const locData = await locRes.json()
          if (Array.isArray(locData)) {
            realNodes = locData.map((loc: any) => ({
              id: loc.id || Math.random().toString(),
              name: loc.name || 'Unknown Node',
              type: 'node' as const,
              status: loc.healthStatus === 'stable' ? 'online' : loc.healthStatus === 'offline' ? 'offline' : 'warning',
              uptime: loc.uptimeLabel || 'нет данных',
              load: loc.load || 0,
              latency: loc.ping || 0,
              flag: loc.flag ? loc.flag.toString().toLowerCase().trim() : undefined
            }))
          }
        }
      } catch (err) {
        console.error('Failed to fetch nodes:', err)
      }

      // 2. Fetch System Data (Bot, API)
      let systemNodes: StatusNode[] = []
      try {
        const sysRes = await fetch('/api/system/stats')
        if (sysRes.ok) {
          const sysData = await sysRes.json()
          
          if (sysData && !sysData.error) {
            systemNodes = [
              { 
                id: 'sys-bot', 
                name: sysData.bot?.name || 'Telegram Bot', 
                type: 'service', 
                status: sysData.bot?.status || 'offline', 
                uptime: sysData.bot?.uptime || 'нет данных', 
                load: sysData.bot?.load || 0, 
                latency: sysData.bot?.latency || 0 
              },
              { 
                id: 'sys-api', 
                name: sysData.api?.name || 'Management API', 
                type: 'service', 
                status: sysData.api?.status || 'offline', 
                uptime: sysData.api?.uptime || 'нет данных', 
                load: sysData.api?.load || 0, 
                latency: sysData.api?.latency || 0 
              }
            ]
          }
        }
      } catch (err) {
        console.error('Failed to fetch system stats:', err)
      }

      setNodes([...realNodes, ...systemNodes])
      setLastCheck(new Date().toLocaleTimeString('ru-RU'))
    } catch (error) {
      console.error('Final system status fetch failure:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchData()
  }

  const nodeGroup = nodes.filter(n => n.type === 'node')
  const serviceGroup = nodes.filter(n => n.type === 'service')
  const totalSystems = nodes.length
  const overallAvailability = getAvailabilityPercent(nodes)
  const nodeAvailability = getAvailabilityPercent(nodeGroup)
  const serviceAvailability = getAvailabilityPercent(serviceGroup)
  const summaryState = getSummaryState(nodes)
  const summaryClasses = getSummaryClasses(summaryState.tone)

  if (isLoading) {
    return (
      <div className="app-screen-shell flex h-screen items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const renderSection = (items: StatusNode[]) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="space-y-3 min-h-1 px-1">
        {items.map((node) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-white/5 bg-white/5"
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-foreground/60 overflow-hidden">
                  {node.type === 'node' && <FlagIcon flag={node.flag} />}
                  {node.type === 'service' && <div className="p-2.5"><Cpu className="h-5 w-5" /></div>}
                </div>
                <div>
                  <div className="text-sm font-medium">{node.name}</div>
                  <div className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${node.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : node.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                    <div className="text-[10px] text-foreground/40 uppercase tracking-tight font-medium">
                      {node.type === 'node' ? 'VPN NODE' : 'SYSTEM'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${node.status === 'online' ? 'text-green-500' : node.status === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}>
                  {node.uptime || 'OK'}
                </div>
                <div className="text-[10px] text-foreground/40 font-medium tracking-tight">
                  UPTIME
                </div>
              </div>
            </div>

            {(node.latency !== undefined || node.load !== undefined) && (
              <div className="flex border-t border-white/5 bg-white/[0.02] px-4 py-2">
                <div className="flex flex-1 items-center gap-2">
                  <Clock className="h-3 w-3 text-foreground/40" />
                  <span className="text-[10px] text-foreground/60">{node.latency}ms</span>
                </div>
                <div className="flex flex-1 items-center gap-2">
                  <Server className="h-3 w-3 text-foreground/40" />
                  <span className="text-[10px] text-foreground/60">{node.load}% LOAD</span>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full ${node.status === 'online' ? 'bg-green-500/10' : node.status === 'warning' ? 'bg-yellow-500/10' : 'bg-red-500/10'} px-2 py-0.5`}>
                  <CheckCircle2 className={`h-2.5 w-2.5 ${node.status === 'online' ? 'text-green-500' : node.status === 'warning' ? 'text-yellow-500' : 'text-red-500'}`} />
                  <span className={`text-[10px] font-bold ${node.status === 'online' ? 'text-green-500' : node.status === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}>{node?.status?.toUpperCase()}</span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="app-screen-shell flex min-h-screen flex-col p-4 pb-24 text-foreground">
      <div className="mb-6 flex h-12 items-center justify-between">
        <button 
          onClick={() => onNavigate('home')}
          className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-foreground/60 transition-colors hover:bg-white/10"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="relative z-10">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-primary transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="text-center">
          <div className="mx-auto h-[5.5rem] w-[5.5rem]">
            <img
              src="/images/status-header.gif"
              alt="Статус сервисов"
              className="h-full w-full object-contain"
              loading="eager"
              draggable={false}
            />
          </div>

          <h1 className="mt-3 text-[2rem] font-black leading-[1.02] tracking-[-0.045em] text-foreground">
            Статус сервисов
          </h1>

          <p className="mx-auto mt-2 max-w-[21rem] text-sm leading-6 text-muted-foreground">
            Актуальное состояние VPN-узлов и основных сервисов в реальном времени.
          </p>
        </div>

        <div className="pointer-events-none mb-4 mt-2 flex justify-center">
          <div className="relative h-10 w-28">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent" />
            <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/75 shadow-[0_0_18px_rgba(52,211,153,0.45)]" />
          </div>
        </div>

        <div className={`mb-8 overflow-hidden rounded-[28px] border p-5 shadow-[0_20px_60px_rgba(2,6,23,0.22)] ${summaryClasses.shell}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${summaryClasses.iconWrap}`}>
                <summaryState.Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-foreground/45">Сводка сети</p>
                <h2 className="mt-2 text-[24px] font-black leading-[1.02] tracking-[-0.03em] text-foreground text-balance sm:text-[28px]">
                  {summaryState.title}
                </h2>
                <p className={`mt-3 max-w-[34ch] text-[14px] leading-6 ${summaryClasses.accent}`}>
                  {summaryState.message}
                </p>
              </div>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 backdrop-blur-sm lg:min-w-[180px]">
              <div className={`text-4xl font-black tracking-[-0.04em] ${summaryClasses.percent}`}>
                {formatPercent(overallAvailability)}
              </div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45">
                Доступность сейчас
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className={`rounded-2xl border px-3 py-3 ${summaryClasses.soft}`}>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-current/60">Общий</div>
              <div className="mt-1 text-lg font-black tracking-tight">{formatPercent(overallAvailability)}</div>
            </div>
            <div className={`rounded-2xl border px-3 py-3 ${summaryClasses.soft}`}>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-current/60">VPN</div>
              <div className="mt-1 text-lg font-black tracking-tight">{formatPercent(nodeAvailability)}</div>
            </div>
            <div className={`rounded-2xl border px-3 py-3 ${summaryClasses.soft}`}>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-current/60">Core</div>
              <div className="mt-1 text-lg font-black tracking-tight">{formatPercent(serviceAvailability)}</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <div className="text-[11px] text-foreground/65">
              {nodes.filter((item) => item.status === 'online').length} из {totalSystems} систем online
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/35">
              Проверка: {lastCheck}
            </div>
          </div>
        </div>

        <SectionHeader title="Узлы VPN" />
        {renderSection(nodeGroup)}
        
        <SectionHeader title="Основные сервисы" />
        {renderSection(serviceGroup)}
      </div>
    </div>
  )
}
