'use client'

import { useState } from 'react'
import { ArrowLeft, Shield, Crown, Headphones, UserPlus, X, Search, User, Trash2 } from 'lucide-react'
import type { AppView, UserRole } from '@/lib/types'
import { MOCK_USERS } from '@/lib/store'
import { cn } from '@/lib/utils'

interface AdminAdminsViewProps {
  onNavigate: (view: AppView) => void
}

const ROLE_CONFIG: Record<UserRole, { label: string; icon: typeof Shield; color: string; bgColor: string }> = {
  owner: { label: 'Владелец', icon: Crown, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
  admin: { label: 'Админ', icon: Shield, color: 'text-primary', bgColor: 'bg-primary/10' },
  support: { label: 'Поддержка', icon: Headphones, color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
  user: { label: 'Пользователь', icon: User, color: 'text-muted-foreground', bgColor: 'bg-secondary' },
}

export function AdminAdminsView({ onNavigate }: AdminAdminsViewProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [addUsername, setAddUsername] = useState('')
  const [addRole, setAddRole] = useState<'admin' | 'support'>('support')

  const staffUsers = MOCK_USERS.filter((u) => u.role !== 'user')

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <button
        onClick={() => onNavigate('admin')}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Админ панель
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Команда</h1>
          <p className="mt-1 text-sm text-muted-foreground">{staffUsers.length} сотрудников</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Добавить
        </button>
      </div>

      {/* Role summary */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {(['owner', 'admin', 'support'] as UserRole[]).map((role) => {
          const config = ROLE_CONFIG[role]
          const Icon = config.icon
          const count = MOCK_USERS.filter((u) => u.role === role).length
          return (
            <div key={role} className="flex flex-col items-center rounded-xl border border-border bg-card p-3">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', config.bgColor)}>
                <Icon className={cn('h-4 w-4', config.color)} />
              </div>
              <span className="mt-2 text-lg font-extrabold text-foreground">{count}</span>
              <span className="text-[10px] text-muted-foreground">{config.label}</span>
            </div>
          )
        })}
      </div>

      {/* Staff list */}
      <div className="mt-6 space-y-3">
        {staffUsers.map((user) => {
          const roleConfig = ROLE_CONFIG[user.role]
          const RoleIcon = roleConfig.icon
          return (
            <div key={user.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', roleConfig.bgColor)}>
                  <RoleIcon className={cn('h-5 w-5', roleConfig.color)} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                    roleConfig.bgColor, roleConfig.color
                  )}>
                    {roleConfig.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    с {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>

              {user.role !== 'owner' && (
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <select
                    defaultValue={user.role}
                    className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="support">Поддержка</option>
                    <option value="admin">Админ</option>
                    <option value="user">Снять роль</option>
                  </select>
                  <button className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 text-destructive transition-colors hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add staff modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-2xl border-t border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Добавить сотрудника</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Telegram username</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    placeholder="@username"
                    className="w-full rounded-xl border border-border bg-secondary py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Роль</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAddRole('support')}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                      addRole === 'support'
                        ? 'border-blue-400 bg-blue-400/5'
                        : 'border-border bg-secondary hover:border-blue-400/30'
                    )}
                  >
                    <Headphones className={cn('h-6 w-6', addRole === 'support' ? 'text-blue-400' : 'text-muted-foreground')} />
                    <span className={cn('text-xs font-semibold', addRole === 'support' ? 'text-blue-400' : 'text-foreground')}>Поддержка</span>
                    <span className="text-[10px] text-muted-foreground">Отвечает на тикеты</span>
                  </button>
                  <button
                    onClick={() => setAddRole('admin')}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                      addRole === 'admin'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-secondary hover:border-primary/30'
                    )}
                  >
                    <Shield className={cn('h-6 w-6', addRole === 'admin' ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-xs font-semibold', addRole === 'admin' ? 'text-primary' : 'text-foreground')}>Админ</span>
                    <span className="text-[10px] text-muted-foreground">Полный доступ</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
              >
                Назначить роль
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
