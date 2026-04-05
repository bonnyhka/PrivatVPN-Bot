'use client'

import { useState, useEffect } from 'react'
import { Key, Plus, Trash2, Copy, Check } from 'lucide-react'
import type { AppView, Plan } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useTelegramUser } from './providers/telegram-provider'

interface AdminKeysViewProps {
  plans: Plan[]
  onNavigate: (view: AppView) => void
}

export function AdminKeysView({ plans, onNavigate }: AdminKeysViewProps) {
  const { user, refreshUser } = useTelegramUser()
  const [keys, setKeys] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ userId: '', planId: 'guardian', expiresAt: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/keys').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
    ]).then(([k, u]) => {
      if (Array.isArray(k)) setKeys(k)
      if (Array.isArray(u)) setUsers(u)
    }).finally(() => setLoading(false))
  }, [])

  function copyKey(key: string, id: string) {
    navigator.clipboard.writeText(key)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function revokeKey(keyId: string) {
    if (!confirm('Отозвать ключ?')) return
    await fetch('/api/admin/keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyId }),
    })
    setKeys(prev => prev.filter(k => k.id !== keyId))
    if (user?.subscription?.id === keyId) {
      await refreshUser()
    }
  }

  async function addKey() {
    if (!form.userId || !form.expiresAt) return
    setSaving(true)
    const res = await fetch('/api/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const newKey = await res.json()
    if (!newKey.error) {
      const user = users.find(u => u.id === form.userId)
      setKeys(prev => [{
        id: newKey.id,
        key: newKey.subscriptionUrl,
        userId: newKey.userId,
        username: user?.username || user?.displayName || 'Unknown',
        planName: newKey.planId,
        status: newKey.status,
        isManual: newKey.isManual,
        createdAt: newKey.createdAt,
        expiresAt: newKey.expiresAt,
      }, ...prev])
      setShowAdd(false)
      setForm({ userId: '', planId: 'guardian', expiresAt: '' })
      if (form.userId === user?.id) {
        await refreshUser()
      }
    }
    setSaving(false)
  }

  const activeKeys = keys.filter(k => k.status === 'active')

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <button onClick={() => onNavigate('admin')} className="mb-4 text-xs text-muted-foreground hover:text-foreground">
        ← Назад
      </button>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">VPN ключи</h1>
            <p className="mt-1 text-sm text-muted-foreground">{activeKeys.length} активных</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Выдать
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Выдать новый ключ</p>
          <select
            value={form.userId}
            onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
            className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
          >
            <option value="">Выберите пользователя...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.displayName} ({u.telegramId})</option>
            ))}
          </select>
          <select
            value={form.planId}
            onChange={e => setForm(f => ({ ...f, planId: e.target.value }))}
            className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
          >
            {plans.map((p: Plan) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={form.expiresAt}
            onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
            className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
          />
          <button
            onClick={addKey}
            disabled={saving}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Выдать ключ'}
          </button>
        </div>
      )}

      {/* Keys list */}
      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : keys.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Ключей пока нет</div>
        ) : keys.map((k) => (
          <div key={k.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">@{k.username}</p>
                <p className="text-xs text-muted-foreground capitalize">{k.planName} · {k.status === 'active' ? 'Активен' : 'Истёк'}</p>
              </div>
              <span className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                k.status === 'active' ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
              )}>
                {k.status === 'active' ? 'Активен' : 'Истёк'}
              </span>
              <span className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                k.isManual || k.isTrial
                  ? 'bg-amber-500/15 text-amber-500' 
                  : 'bg-blue-500/15 text-blue-500'
              )}>
                {k.isManual || k.isTrial ? 'Выдан админом' : 'Куплено'}
              </span>
            </div>
            <code className="mt-2 block truncate rounded-lg bg-secondary px-3 py-1.5 font-mono text-[10px] text-foreground/80">
              {k.key}
            </code>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              до {new Date(k.expiresAt).toLocaleDateString('ru-RU')}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => copyKey(k.key, k.id)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-secondary py-1.5 text-xs text-foreground transition-colors hover:bg-primary/10"
              >
                {copiedId === k.id ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedId === k.id ? 'Скопировано' : 'Скопировать'}
              </button>
              <button
                onClick={() => revokeKey(k.id)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Отозвать
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
