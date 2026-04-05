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
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(56,189,248,0.10),transparent_55%),radial-gradient(1000px_circle_at_90%_10%,rgba(99,102,241,0.12),transparent_60%),radial-gradient(900px_circle_at_40%_120%,rgba(16,185,129,0.06),transparent_60%)]" />
      <div className="relative mx-auto max-w-[1600px] px-4 py-4 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          <aside className="md:w-[340px] shrink-0 md:sticky md:top-6 self-start">
            <div className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-xl shadow-black/20 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold">PrivatVPN</div>
                  <div className="text-[11px] text-muted-foreground">Admin panel</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Выйти
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                <div className="text-xs font-bold">{user.displayName || user.username || user.telegramId}</div>
                <div className="text-[11px] text-muted-foreground">роль: {user.role}</div>
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
                        'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                        isActive
                          ? 'border-primary/30 bg-primary/10 text-foreground'
                          : 'border-border bg-background/30 text-muted-foreground hover:text-foreground hover:border-primary/20'
                      )}
                    >
                      <Icon className={cx('h-4 w-4', isActive && 'text-primary')} />
                      <span className="font-semibold">{item.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </aside>

          <main className="flex-1">
            <div className="rounded-2xl border border-border/80 bg-card/80 p-4 md:p-6 shadow-xl shadow-black/20 backdrop-blur">
              <div className="mb-4 flex items-center gap-3">
                <active.icon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-extrabold">{active.label}</h2>
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

