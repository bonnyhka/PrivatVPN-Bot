'use client'

import { useState, useEffect } from 'react'
import { Users, Search, ShieldCheck, Shield, User, Crown } from 'lucide-react'
import type { AppView } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AdminUsersViewProps {
  onNavigate: (view: AppView) => void
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Админ',
  support: 'Поддержка',
  user: 'Пользователь',
}

const ROLE_ICONS: Record<string, typeof User> = {
  owner: Crown,
  admin: ShieldCheck,
  support: Shield,
  user: User,
}

export function AdminUsersView({ onNavigate }: AdminUsersViewProps) {
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setUsers(d) })
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u =>
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.telegramId?.includes(search)
  )

  async function changeRole(userId: string, role: string) {
    setUpdating(userId)
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    setUpdating(null)
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      {/* Header */}
      <button onClick={() => onNavigate('admin')} className="mb-4 text-xs text-muted-foreground hover:text-foreground">
        ← Назад
      </button>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Пользователи</h1>
          <p className="mt-1 text-sm text-muted-foreground">{users.length} зарегистрировано</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск по имени, @username или ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
        />
      </div>

      {/* User list */}
      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Пользователи не найдены</div>
        ) : filtered.map((user) => {
          const RoleIcon = ROLE_ICONS[user.role] || User
          return (
            <div key={user.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt={user.displayName} className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-foreground">
                    {user.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.username ? `@${user.username}` : `ID: ${user.telegramId}`}
                    {user.subscription && (
                      <span className="ml-2 text-primary">
                        • {user.subscription.status === 'active' ? 'Активна' : 'Истекла'}
                        {user.subscription.trafficUsed && (
                          <span className="ml-1 font-mono text-[10px] opacity-70">
                            ({(Number(user.subscription.trafficUsed) / (1024 ** 3)).toFixed(2)} GB)
                          </span>
                        )}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1">
                  <RoleIcon className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-medium text-foreground">{ROLE_LABELS[user.role] || user.role}</span>
                </div>
              </div>

              {/* Role change */}
              <div className="mt-3 flex gap-1.5 flex-wrap">
                {['user', 'support', 'admin', 'owner'].map(role => (
                  <button
                    key={role}
                    disabled={user.role === role || updating === user.id}
                    onClick={() => changeRole(user.id, role)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors',
                      user.role === role
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
