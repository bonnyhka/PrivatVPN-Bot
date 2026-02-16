'use client'

import { useState } from 'react'
import { ArrowLeft, Key, Copy, Check, Plus, X, Trash2 } from 'lucide-react'
import type { AppView } from '@/lib/types'
import { MOCK_VPN_KEYS, MOCK_USERS, PLANS } from '@/lib/store'
import { cn } from '@/lib/utils'

interface AdminKeysViewProps {
  onNavigate: (view: AppView) => void
}

export function AdminKeysView({ onNavigate }: AdminKeysViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyUsername, setNewKeyUsername] = useState('')
  const [newKeyPlan, setNewKeyPlan] = useState(PLANS[0]?.id || 'lite')

  const handleCopy = (id: string, key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

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
          <h1 className="text-xl font-bold text-foreground">VPN ключи</h1>
          <p className="mt-1 text-sm text-muted-foreground">{MOCK_VPN_KEYS.length} ключей выдано</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" />
          Выдать
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mt-4 flex gap-2">
        {['Все', 'Активные', 'Истекшие'].map((tab) => (
          <button
            key={tab}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              tab === 'Все'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Keys list */}
      <div className="mt-4 space-y-3">
        {MOCK_VPN_KEYS.map((vpnKey) => (
          <div
            key={vpnKey.id}
            className={cn(
              'rounded-xl border bg-card p-4',
              vpnKey.status === 'active' ? 'border-border' : 'border-border/50 opacity-70'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Key className={cn(
                  'h-4 w-4',
                  vpnKey.status === 'active' ? 'text-primary' : 'text-muted-foreground'
                )} />
                <div>
                  <p className="text-sm font-semibold text-foreground">@{vpnKey.username}</p>
                  <p className="text-xs text-muted-foreground">{vpnKey.planName}</p>
                </div>
              </div>
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                vpnKey.status === 'active'
                  ? 'bg-primary/15 text-primary'
                  : vpnKey.status === 'expired'
                  ? 'bg-orange-500/15 text-orange-400'
                  : 'bg-destructive/15 text-destructive'
              )}>
                {vpnKey.status === 'active' ? 'Активен' : vpnKey.status === 'expired' ? 'Истёк' : 'Отозван'}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary p-2.5">
              <code className="flex-1 truncate font-mono text-[10px] text-primary">
                {vpnKey.key}
              </code>
              <button
                onClick={() => handleCopy(vpnKey.id, vpnKey.key)}
                className="shrink-0 rounded-md bg-primary/10 p-1.5 text-primary transition-colors hover:bg-primary/20"
              >
                {copiedId === vpnKey.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Создан: {new Date(vpnKey.createdAt).toLocaleDateString('ru-RU')}</span>
              <span>Истекает: {new Date(vpnKey.expiresAt).toLocaleDateString('ru-RU')}</span>
            </div>

            {vpnKey.status === 'active' && (
              <div className="mt-3 flex gap-2">
                <button className="flex-1 rounded-lg border border-border bg-secondary py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/30">
                  Продлить
                </button>
                <button className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10">
                  <Trash2 className="h-3 w-3" />
                  Отозвать
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create key modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-2xl border-t border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Выдать VPN ключ</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Telegram username</label>
                <input
                  type="text"
                  value={newKeyUsername}
                  onChange={(e) => setNewKeyUsername(e.target.value)}
                  placeholder="@username"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Тарифный план</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setNewKeyPlan(plan.id)}
                      className={cn(
                        'rounded-xl border p-3 text-left transition-all',
                        newKeyPlan === plan.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-secondary hover:border-primary/30'
                      )}
                    >
                      <p className="text-xs font-semibold text-foreground">{plan.name}</p>
                      <p className="text-[10px] text-muted-foreground">{plan.price} {'\u20BD'} {plan.period}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
              >
                Создать и отправить ключ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
