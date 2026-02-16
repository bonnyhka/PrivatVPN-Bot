'use client'

import { useState } from 'react'
import { ArrowLeft, Search, User, Shield, Crown, Headphones, MoreVertical, ChevronDown } from 'lucide-react'
import type { AppView, UserRole } from '@/lib/types'
import { MOCK_USERS } from '@/lib/store'
import { cn } from '@/lib/utils'

interface AdminUsersViewProps {
  onNavigate: (view: AppView) => void
}

const ROLE_CONFIG: Record<UserRole, { label: string; icon: typeof User; color: string }> = {
  owner: { label: 'Владелец', icon: Crown, color: 'text-yellow-400' },
  admin: { label: 'Админ', icon: Shield, color: 'text-primary' },
  support: { label: 'Поддержка', icon: Headphones, color: 'text-blue-400' },
  user: { label: 'Пользователь', icon: User, color: 'text-muted-foreground' },
}

export function AdminUsersView({ onNavigate }: AdminUsersViewProps) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [showRoleMenu, setShowRoleMenu] = useState<string | null>(null)

  const filteredUsers = MOCK_USERS.filter((user) => {
    const matchesSearch = user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.displayName.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <button
        onClick={() => onNavigate('admin')}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Админ панель
      </button>

      <h1 className="text-xl font-bold text-foreground">Пользователи</h1>
      <p className="mt-1 text-sm text-muted-foreground">{MOCK_USERS.length} зарегистрировано</p>

      {/* Search */}
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени..."
          className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {/* Role filters */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {(['all', 'owner', 'admin', 'support', 'user'] as const).map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={cn(
              'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              roleFilter === role
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {role === 'all' ? 'Все' : ROLE_CONFIG[role].label}
          </button>
        ))}
      </div>

      {/* Users list */}
      <div className="mt-4 space-y-2">
        {filteredUsers.map((user) => {
          const roleInfo = ROLE_CONFIG[user.role]
          const RoleIcon = roleInfo.icon
          return (
            <div
              key={user.id}
              className="relative rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                  {user.displayName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{user.displayName}</p>
                    <RoleIcon className={cn('h-3.5 w-3.5', roleInfo.color)} />
                  </div>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
                <div className="text-right">
                  <span className={cn(
                    'inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    user.subscription?.status === 'active'
                      ? 'bg-primary/15 text-primary'
                      : 'bg-secondary text-muted-foreground'
                  )}>
                    {user.subscription?.status === 'active' ? 'Активен' : 'Нет подписки'}
                  </span>
                </div>
              </div>

              {/* Role change dropdown */}
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div className="relative">
                  <button
                    onClick={() => setShowRoleMenu(showRoleMenu === user.id ? null : user.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/10"
                  >
                    <span>{roleInfo.label}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showRoleMenu === user.id && (
                    <div className="absolute left-0 top-full z-10 mt-1 w-40 rounded-xl border border-border bg-card p-1 shadow-xl">
                      {(['user', 'support', 'admin'] as UserRole[]).map((role) => (
                        <button
                          key={role}
                          onClick={() => setShowRoleMenu(null)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-secondary',
                            user.role === role && 'text-primary'
                          )}
                        >
                          {ROLE_CONFIG[role].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  ID: {user.telegramId}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
