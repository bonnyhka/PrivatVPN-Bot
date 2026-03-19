'use client'

import { useState } from 'react'
import { Gift, Copy, Check, Users, Wallet, ChevronRight, Share2 } from 'lucide-react'
import type { User, AppView } from '@/lib/types'
import { MOCK_REFERRALS } from '@/lib/store'
import { cn } from '@/lib/utils'

interface ReferralViewProps {
  user: User
  onNavigate: (view: AppView) => void
}

export function ReferralView({ user, onNavigate }: ReferralViewProps) {
  const [copied, setCopied] = useState(false)

  const referrals = MOCK_REFERRALS.filter(r => r.fromUserId === user.id)
  const totalEarned = referrals.filter(r => r.status === 'credited').reduce((sum, r) => sum + r.reward, 0)
  const pendingEarned = referrals.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.reward, 0)
  const refLink = `https://t.me/PrivatVPN_bot?start=ref_${user.id}`

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Реферальная программа</h1>
          <p className="text-xs text-muted-foreground">Зарабатывай вместе с друзьями</p>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <h3 className="text-sm font-bold text-foreground">Как это работает?</h3>
        <div className="mt-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</div>
            <div>
              <p className="text-sm font-medium text-foreground">Поделись ссылкой</p>
              <p className="text-xs text-muted-foreground">Отправь реферальную ссылку другу</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</div>
            <div>
              <p className="text-sm font-medium text-foreground">Друг подключает VPN</p>
              <p className="text-xs text-muted-foreground">Оплачивает любой тариф</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</div>
            <div>
              <p className="text-sm font-medium text-foreground">Получи 30 руб на баланс</p>
              <p className="text-xs text-muted-foreground">Бонус начисляется мгновенно</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-3">
          <Users className="mb-1 h-4 w-4 text-primary" />
          <span className="text-lg font-extrabold text-foreground">{referrals.length}</span>
          <span className="text-[10px] text-muted-foreground">Приглашено</span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-3">
          <Wallet className="mb-1 h-4 w-4 text-primary" />
          <span className="text-lg font-extrabold text-foreground">{totalEarned}</span>
          <span className="text-[10px] text-muted-foreground">Заработано</span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-3">
          <Gift className="mb-1 h-4 w-4 text-yellow-400" />
          <span className="text-lg font-extrabold text-foreground">{pendingEarned}</span>
          <span className="text-[10px] text-muted-foreground">Ожидает</span>
        </div>
      </div>

      {/* Ref link */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Ваша реферальная ссылка</p>
        <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
          <code className="flex-1 truncate font-mono text-xs text-primary">
            {refLink}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <button
          onClick={handleCopy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          <Share2 className="h-4 w-4" />
          Поделиться ссылкой
        </button>
      </div>

      {/* Referral history */}
      <h2 className="mb-3 mt-6 text-sm font-medium text-muted-foreground">История приглашений</h2>
      {referrals.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Пока нет приглашений</p>
          <p className="mt-1 text-xs text-muted-foreground">Поделитесь ссылкой с друзьями</p>
        </div>
      ) : (
        <div className="space-y-2">
          {referrals.map((ref) => (
            <div key={ref.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                {ref.toUsername.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">@{ref.toUsername}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(ref.createdAt).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <div className="text-right">
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-bold',
                  ref.status === 'credited'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-yellow-500/15 text-yellow-400'
                )}>
                  +{ref.reward} {'\u20BD'}
                </span>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {ref.status === 'credited' ? 'Начислено' : 'Ожидает'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Balance withdrawal (future) */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Баланс: {totalEarned} {'\u20BD'}</p>
            <p className="text-xs text-muted-foreground">Используйте для оплаты тарифа</p>
          </div>
          <button className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
            Списать
          </button>
        </div>
      </div>
    </div>
  )
}
