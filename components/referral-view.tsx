'use client'

import { useState } from 'react'
import { Gift, Copy, Check, Users, Wallet, ChevronRight, Share2 } from 'lucide-react'
import type { User, AppView } from '@/lib/types'
import { MOCK_REFERRALS } from '@/lib/store'
import { cn } from '@/lib/utils'
import { AnimatedContainer, AnimatedItem } from '@/components/ui/animated-view'

interface ReferralViewProps {
  user: User
  onNavigate: (view: AppView) => void
}

export function ReferralView({ user, onNavigate }: ReferralViewProps) {
  const [copied, setCopied] = useState(false)

  const referralsCount = user.referralsCount || 0
  const totalEarned = user.balance || 0
  const pendingEarned = user.referrals?.filter(r => r.status === 'pending').reduce((acc, r) => acc + r.reward, 0) || 0
  const refLink = user.referralCode ? `https://t.me/privatruvpn_bot?start=${user.referralCode}` : '...'

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    const text = `🛡 Подключай PrivatVPN — стабильный VPN для обхода блокировок!\nПо моей ссылке ты получишь пробный период бесплатно 👇\n${refLink}`
    const tg = (window as any).Telegram?.WebApp
    if (tg?.openTelegramLink) {
      // Share via Telegram native share
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('🛡 Попробуй PrivatVPN бесплатно — стабильный VPN для обхода блокировок!')}`
      tg.openTelegramLink(shareUrl)
    } else if (navigator.share) {
      navigator.share({ title: 'PrivatVPN', text, url: refLink }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <AnimatedContainer className="min-h-screen px-4 pb-24 pt-6">
      {/* Header */}
      <AnimatedItem className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Реферальная программа</h1>
          <p className="text-xs text-muted-foreground">Зарабатывай вместе с друзьями</p>
        </div>
      </AnimatedItem>

      {/* How it works */}
      <AnimatedItem className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
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
      </AnimatedItem>

      {/* Stats */}
      <AnimatedItem className="mt-4 grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-3">
          <Users className="mb-1 h-4 w-4 text-primary" />
          <span className="text-lg font-extrabold text-foreground">{referralsCount}</span>
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
      </AnimatedItem>

      {/* Ref link */}
      <AnimatedItem className="mt-4 rounded-xl border border-border bg-card p-4">
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
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
          >
            <Share2 className="h-4 w-4" />
            Поделиться
          </button>
          <button
            onClick={handleCopy}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </AnimatedItem>

      {/* Referral history */}
      <AnimatedItem>
        <h2 className="mb-3 mt-6 text-sm font-medium text-muted-foreground">История приглашений</h2>
      </AnimatedItem>
      <AnimatedItem>
      {!user.referrals || user.referrals.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Пока нет приглашений</p>
          <p className="mt-1 text-xs text-muted-foreground">Поделитесь ссылкой с друзьями</p>
        </div>
      ) : (
        <div className="space-y-3">
          {user.referrals.map((ref) => (
            <div key={ref.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                  {ref.toAvatar ? (
                    <img src={ref.toAvatar} alt={ref.toUsername || ref.toDisplayName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">
                      {(ref.toUsername || ref.toDisplayName).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {ref.toUsername ? `@${ref.toUsername}` : ref.toDisplayName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(ref.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">+{ref.reward} {'\u20BD'}</p>
                <div className="flex items-center justify-end gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-[9px] font-medium text-muted-foreground uppercase">
                    {ref.status === 'credited' ? 'Начислено' : 'В ожидании'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </AnimatedItem>

      {/* Balance display */}
      <AnimatedItem className="mt-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Баланс: {totalEarned} {'\u20BD'}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Будет использован при оплате тарифа</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
        </div>
      </AnimatedItem>
    </AnimatedContainer>
  )
}
