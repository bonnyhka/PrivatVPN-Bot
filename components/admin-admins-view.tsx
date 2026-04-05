'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Shield, Crown, Headphones, UserPlus, X, User, Trash2 } from 'lucide-react'
import type { AppView } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AdminAdminsViewProps {
  onNavigate: (view: AppView) => void
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Shield; color: string; bgColor: string }> = {
  owner: { label: 'Владелец', icon: Crown, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
  admin: { label: 'Админ', icon: Shield, color: 'text-primary', bgColor: 'bg-primary/10' },
  support: { label: 'Поддержка', icon: Headphones, color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
  user: { label: 'Пользователь', icon: User, color: 'text-muted-foreground', bgColor: 'bg-secondary' },
}

export function AdminAdminsView({ onNavigate }: AdminAdminsViewProps) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addRole, setAddRole] = useState<'admin' | 'support'>('support')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setUsers(d) })
      .finally(() => setLoading(false))
  }, [])

  const staffUsers = users.filter(u => u.role !== 'user')

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

  const roleCounts = ['owner', 'admin', 'support'].map(r => ({
    role: r,
    count: users.filter(u => u.role === r).length,
  }))

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <button
        onClick={() => onNavigate('admin')}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Команда</h1>
          <p className="mt-1 text-sm text-muted-foreground">{staffUsers.length} сотрудников</p>
        </div>
      </div>

      {/* Role summary */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {roleCounts.map(({ role, count }) => {
          const config = ROLE_CONFIG[role]
          const Icon = config.icon
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
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : staffUsers.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Нет сотрудников</div>
        ) : staffUsers.map((user) => {
          const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.user
          const RoleIcon = roleConfig.icon
          return (
            <div key={user.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt={user.displayName} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', roleConfig.bgColor)}>
                    <RoleIcon className={cn('h-5 w-5', roleConfig.color)} />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.username ? `@${user.username}` : `ID: ${user.telegramId}`}</p>
                </div>
                <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold', roleConfig.bgColor, roleConfig.color)}>
                  {roleConfig.label}
                </span>
              </div>

              {user.role !== 'owner' && (
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <select
                    value={user.role}
                    onChange={e => changeRole(user.id, e.target.value)}
                    disabled={updating === user.id}
                    className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="support">Поддержка</option>
                    <option value="admin">Админ</option>
                    <option value="user">Снять роль</option>
                  </select>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
