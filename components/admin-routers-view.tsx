'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, HardDrive, Shield, Activity, Terminal, CheckCircle2, XCircle, Loader2, Search, User, ChevronDown, X, Wifi } from 'lucide-react'
import type { AppView } from '@/lib/types'
import { useTelegramUser } from './providers/telegram-provider'
import { cn } from '@/lib/utils'

interface AdminRoutersViewProps {
  onNavigate: (view: AppView) => void
}

interface DbUser {
  id: string
  telegramId: string
  username: string | null
  displayName: string
  role: string
  subscription: { planId: string; status: string } | null
}

const PLAN_LABELS: Record<string, string> = {
  scout: 'Scout',
  guardian: 'Guardian',
  fortress: 'Fortress',
  citadel: 'Citadel',
}

export function AdminRoutersView({ onNavigate }: AdminRoutersViewProps) {
  const { user } = useTelegramUser()
  const [routerIp, setRouterIp] = useState('192.168.1.1')
  const [password, setPassword] = useState('admin')
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [output, setOutput] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')

  // User picker state
  const [users, setUsers] = useState<DbUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [selectedUser, setSelectedUser] = useState<DbUser | null>(null)
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data)
      })
      .catch(console.error)
      .finally(() => setLoadingUsers(false))
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase()
    return (
      u.displayName.toLowerCase().includes(q) ||
      (u.username?.toLowerCase().includes(q) ?? false) ||
      u.telegramId.includes(q)
    )
  })

  const handleProvision = async () => {
    if (!selectedUser) return alert('Выберите пользователя')

    setIsProvisioning(true)
    setStatus('running')
    setOutput(['--- Начинается прошивка роутера ---', `→ Клиент: ${selectedUser.displayName} (${selectedUser.telegramId})`])

    try {
      const response = await fetch('/api/admin/provision-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routerIp,
          targetTelegramId: selectedUser.telegramId,
          routerPassword: password,
          telegramId: user?.telegramId
        })
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setOutput(prev => [...prev, ...data.output.split('\n').filter(Boolean), '✓ Готово!'])
      } else {
        setStatus('error')
        setOutput(prev => [...prev, `✗ Ошибка: ${data.error}`, data.details].filter(Boolean))
      }
    } catch (err: any) {
      setStatus('error')
      setOutput(prev => [...prev, `✗ Критическая ошибка: ${err.message}`])
    } finally {
      setIsProvisioning(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background p-4 pb-24">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => onNavigate('admin')}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-foreground transition-colors hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Прошивка Роутера</h1>
          <p className="text-xs text-foreground/60">Автоматическая настройка OpenWrt + VLESS</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Form Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl space-y-5">
          
          {/* User picker */}
          <div ref={dropdownRef} className="relative">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-white/50 pl-1">
              Клиент
            </label>
            <button
              type="button"
              onClick={() => setDropdownOpen(v => !v)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border bg-black/40 px-4 py-3.5 text-left transition-all',
                dropdownOpen ? 'border-primary/50 bg-white/5' : 'border-white/5 hover:border-white/10'
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                {selectedUser ? (
                  <span className="text-xs font-bold text-primary">
                    {selectedUser.displayName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="h-4 w-4 text-white/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {selectedUser ? (
                  <>
                    <p className="text-sm font-bold text-white truncate">{selectedUser.displayName}</p>
                    <p className="text-[10px] text-white/30">
                      @{selectedUser.username || '—'} · {selectedUser.telegramId}
                      {selectedUser.subscription && (
                        <span className="ml-1.5 text-primary">· {PLAN_LABELS[selectedUser.subscription.planId] || selectedUser.subscription.planId}</span>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-white/30">Выберите пользователя...</p>
                )}
              </div>
              {selectedUser ? (
                <X
                  className="h-4 w-4 shrink-0 text-white/30 hover:text-white transition-colors"
                  onClick={(e) => { e.stopPropagation(); setSelectedUser(null) }}
                />
              ) : (
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-white/30 transition-transform', dropdownOpen && 'rotate-180')} />
              )}
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-white/10 bg-[#0d0d1a] shadow-2xl overflow-hidden">
                {/* Search */}
                <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2.5">
                  <Search className="h-3.5 w-3.5 shrink-0 text-white/30" />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Поиск по имени, @username, ID..."
                    className="w-full bg-transparent text-xs text-white placeholder:text-white/30 outline-none"
                  />
                </div>

                {/* List */}
                <div className="max-h-56 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-xs text-white/30">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Загрузка...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="py-6 text-center text-xs text-white/30">Пользователи не найдены</p>
                  ) : (
                    filteredUsers.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setSelectedUser(u); setDropdownOpen(false); setSearch('') }}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5',
                          selectedUser?.id === u.id && 'bg-primary/10'
                        )}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-white/60">
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{u.displayName}</p>
                          <p className="text-[10px] text-white/30 truncate">
                            @{u.username || '—'} · {u.telegramId}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {u.subscription ? (
                            <span className={cn(
                              'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase',
                              u.subscription.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/30'
                            )}>
                              {PLAN_LABELS[u.subscription.planId] || u.subscription.planId}
                            </span>
                          ) : (
                            <span className="text-[9px] text-white/20">нет подписки</span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Router IP */}
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-white/50 pl-1">
              IP Адрес Роутера
            </label>
            <div className="relative">
              <Wifi className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
              <input
                type="text"
                value={routerIp}
                onChange={(e) => setRouterIp(e.target.value)}
                className="w-full rounded-xl border border-white/5 bg-black/40 pl-10 pr-4 py-3.5 text-sm font-bold text-white placeholder:text-white/20 focus:border-white/20 focus:bg-white/5 outline-none transition-all"
                placeholder="192.168.1.1"
              />
            </div>
          </div>

          {/* SSH Password */}
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-white/50 pl-1">
              Пароль SSH
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-black/40 px-4 py-3.5 text-sm font-bold text-white placeholder:text-white/20 focus:border-white/20 focus:bg-white/5 outline-none transition-all"
              placeholder="admin"
            />
          </div>

          {/* CTA */}
          <button
            onClick={handleProvision}
            disabled={isProvisioning || !selectedUser}
            className="flex w-full h-14 items-center justify-center gap-2.5 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98] disabled:opacity-40 shadow-lg shadow-primary/20 mt-2"
          >
            {isProvisioning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Настройка...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Начать прошивку
              </>
            )}
          </button>
        </div>

        {/* Log */}
        {status !== 'idle' && (
          <div className="rounded-2xl border border-white/5 bg-black/40 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">Лог</span>
              </div>
              <div className="flex items-center gap-1.5">
                {status === 'running' && <Activity className="h-3 w-3 animate-pulse text-yellow-500" />}
                {status === 'success' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                {status === 'error' && <XCircle className="h-3 w-3 text-red-500" />}
                <span className={cn('text-[10px] uppercase font-bold',
                  status === 'running' ? 'text-yellow-500' :
                  status === 'success' ? 'text-green-500' : 'text-red-500'
                )}>
                  {status === 'running' ? 'Выполнение' : status === 'success' ? 'Готово' : 'Ошибка'}
                </span>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg bg-black/60 p-3 font-mono text-[10px] leading-relaxed text-white/70">
              {output.map((line, i) => (
                <div key={i} className={cn('mb-1 last:mb-0', line.startsWith('✓') && 'text-green-400', line.startsWith('✗') && 'text-red-400')}>
                  <span className="text-primary/40 mr-2">$</span>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        {status === 'idle' && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
            <HardDrive className="mx-auto mb-3 h-8 w-8 text-primary/40" />
            <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-white/60">Как это работает?</h3>
            <p className="text-[11px] text-white/40 leading-relaxed mb-4">
              Клиенту автоматически выдаётся скрытая подписка<br />
              <b className="text-white">Citadel · До 5 Гбит/с · На 100 лет</b>
            </p>
            <ol className="text-[10px] text-white/30 space-y-1.5 text-left bg-black/40 p-4 rounded-xl font-bold">
              <li>1. Выберите клиента из базы данных выше</li>
              <li>2. Подключитесь по LAN/Wi-Fi к роутеру</li>
              <li>3. Убедитесь что на роутере чистый OpenWrt</li>
              <li>4. Нажмите «Начать прошивку»</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
