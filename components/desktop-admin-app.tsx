'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, Globe, Key, Users, Headphones, Tag, DollarSign, Shield, Package, LogOut, LayoutDashboard } from 'lucide-react'
import { DesktopAdminHomeView } from '@/components/desktop-admin-home-view'
import { AdminInfoView } from '@/components/admin-info-view'
import { AdminLocationsView } from '@/components/admin-locations-view'
import { AdminUsersView } from '@/components/admin-users-view'
import { AdminKeysView } from '@/components/admin-keys-view'
import { AdminSupportView } from '@/components/admin-support-view'
import { AdminDiscountsView } from '@/components/admin-discounts-view'
import { AdminPricingView } from '@/components/admin-pricing-view'
import { AdminSecurityView } from '@/components/admin-security-view'
import { AdminOrdersView } from '@/components/admin-orders-view'
import type { AppView, Plan, User } from '@/lib/types'

type NavItem = {
  view: AppView
  label: string
  icon: any
}

const NAV: NavItem[] = [
  { view: 'admin', label: 'Главная', icon: LayoutDashboard },
  { view: 'admin-info', label: 'Диагностика сети', icon: Activity },
  { view: 'admin-locations', label: 'Управление серверами', icon: Globe },
  { view: 'admin-users', label: 'Пользователи', icon: Users },
  { view: 'admin-keys', label: 'VPN ключи', icon: Key },
  { view: 'admin-pricing', label: 'Тарифы', icon: DollarSign },
  { view: 'admin-security', label: 'Безопасность', icon: Shield },
  { view: 'admin-discounts', label: 'Скидки', icon: Tag },
  { view: 'admin-orders', label: 'Заказы', icon: Package },
  { view: 'admin-support', label: 'Поддержка', icon: Headphones },
]

const VIEW_DESCRIPTIONS: Partial<Record<AppView, string>> = {
  admin: 'Общая картина по сервису.',
  'admin-info': 'Состояние сети и диагностика.',
  'admin-locations': 'Узлы и развёртывание.',
  'admin-users': 'Пользователи и подписки.',
  'admin-keys': 'Ключи и доступы.',
  'admin-pricing': 'Тарифы и цены.',
  'admin-security': 'Защита и проверки.',
  'admin-discounts': 'Промокоды и скидки.',
  'admin-orders': 'Заказы устройств.',
  'admin-support': 'Тикеты и поддержка.',
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function DesktopAdminApp() {
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [authLink, setAuthLink] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [view, setView] = useState<AppView>('admin')
  const [plans, setPlans] = useState<Plan[]>([])

  const initialLink = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const url = new URL(window.location.href)
    return url.searchParams.get('sub') || url.searchParams.get('subscription') || url.searchParams.get('link') || ''
  }, [])

  async function refreshUser() {
    setLoadingUser(true)
    try {
      const res = await fetch('/api/user/me', { cache: 'no-store' })
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = await res.json()
      setUser(data.user || null)
    } finally {
      setLoadingUser(false)
    }
  }

  async function loadPlans() {
    try {
      const res = await fetch('/api/plans', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) setPlans(data)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (initialLink) setAuthLink(initialLink)
    refreshUser()
    loadPlans()
  }, [])

  async function handleAuth() {
    setAuthError(null)
    setAuthLoading(true)
    try {
      const res = await fetch('/api/auth/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionLink: authLink }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAuthError(data?.error || 'Не удалось войти')
        return
      }
      await refreshUser()
      // clean URL
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('sub')
        url.searchParams.delete('subscription')
        url.searchParams.delete('link')
        window.history.replaceState({}, '', url.toString())
      } catch {
        // ignore
      }
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    // no dedicated logout endpoint: expire cookie by overwriting in browser
    document.cookie = 'session=; Max-Age=0; path=/'
    await refreshUser()
  }

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Загрузка…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(900px_circle_at_90%_10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(900px_circle_at_40%_120%,rgba(16,185,129,0.10),transparent_60%)]" />
        <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card/80 p-6 shadow-2xl backdrop-blur">
          <h1 className="text-xl font-extrabold">Админ-панель</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Вставьте вашу ссылку подписки, чтобы войти.
          </p>

          <div className="mt-5 space-y-3">
            <input
              value={authLink}
              onChange={(e) => setAuthLink(e.target.value)}
              placeholder="https://privatevp.space/api/sub/…"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary/50"
            />
            <button
              onClick={handleAuth}
              disabled={!authLink.trim() || authLoading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {authLoading ? 'Входим…' : 'Войти'}
            </button>
            {authError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {authError}
              </div>
            )}
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              Доступ дадим только если эта ссылка принадлежит пользователю с ролью <b>admin/owner</b>.
            </div>
          </div>
        </div>
      </div>
    )
  }

  const active = NAV.find((n) => n.view === view) || NAV[0]

  return (
    <div className="min-h-screen bg-[#070c16] text-foreground">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(1100px_circle_at_14%_-8%,rgba(59,130,246,0.18),transparent_52%),radial-gradient(900px_circle_at_92%_0%,rgba(34,197,94,0.08),transparent_46%),linear-gradient(180deg,rgba(8,12,24,0.96),rgba(5,8,18,1))]" />
      <div className="relative mx-auto max-w-[1620px] px-4 py-4 md:px-5 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          <aside className="md:w-[320px] shrink-0 md:sticky md:top-6 self-start">
            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,24,38,0.96),rgba(9,14,26,0.92))] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="rounded-2xl border border-primary/20 bg-primary/[0.10] px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-transparent">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/images/privatvpn-logo.png" alt="PrivatVPN" className="h-11 w-11 object-contain" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold tracking-tight text-foreground">PrivatVPN</div>
                          <div className="mt-0.5 text-[11px] font-medium text-primary/80">Desktop Admin</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/20 hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </button>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-3.5 py-3">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Аккаунт</div>
                    <div className="mt-1 text-sm font-bold">{user.displayName || user.username || user.telegramId}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Роль: {user.role}</div>
                  </div>
                </div>
              </div>

              <nav className="mt-4 grid gap-1.5">
                {NAV.map((item) => {
                  const Icon = item.icon
                  const isActive = item.view === view
                  return (
                    <button
                      key={item.view}
                      onClick={() => setView(item.view)}
                      className={cx(
                        'group flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm transition-all',
                        isActive
                          ? 'border-primary/30 bg-primary/10 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                          : 'border-white/8 bg-white/[0.025] text-muted-foreground hover:border-primary/15 hover:bg-white/[0.04] hover:text-foreground'
                      )}
                    >
                      <div className={cx(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                        isActive ? 'border-primary/20 bg-primary/12 text-primary' : 'border-white/8 bg-black/15 text-muted-foreground group-hover:text-primary'
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="font-semibold">{item.label}</div>
                      </div>
                      {isActive && <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                    </button>
                  )
                })}
              </nav>
            </div>
          </aside>

          <main className="flex-1">
            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,22,36,0.96),rgba(10,15,26,0.92))] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-6">
              <div className="mb-6 flex flex-col gap-3 border-b border-white/8 pb-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                    <active.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight">{active.label}</h2>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {VIEW_DESCRIPTIONS[active.view] || 'Раздел управления сервисом.'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    Online
                  </div>
                </div>
              </div>

              <div className="desktop-admin-embed">
                {view === 'admin' && <DesktopAdminHomeView user={user} />}
                {view === 'admin-info' && <AdminInfoView onNavigate={setView} />}
                {view === 'admin-locations' && <AdminLocationsView onNavigate={setView} />}
                {view === 'admin-users' && <AdminUsersView onNavigate={setView} />}
                {view === 'admin-keys' && <AdminKeysView onNavigate={setView} plans={plans} />}
                {view === 'admin-support' && <AdminSupportView onNavigate={setView} />}
                {view === 'admin-discounts' && <AdminDiscountsView onNavigate={setView} plans={plans} />}
                {view === 'admin-pricing' && <AdminPricingView onNavigate={setView} plans={plans} setPlans={setPlans} />}
                {view === 'admin-security' && <AdminSecurityView onNavigate={setView} />}
                {view === 'admin-orders' && <AdminOrdersView onNavigate={setView} />}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
