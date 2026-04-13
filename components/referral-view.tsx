'use client'

import { useState } from 'react'
import { Copy, Check, Users, Wallet, Share2, Clock3 } from 'lucide-react'
import type { User, AppView } from '@/lib/types'
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
    const text = `🛡 Подключай PrivatVPN — стабильный VPN для комфортного интернета!\nПо моей ссылке ты получишь пробный период бесплатно 👇\n${refLink}`
    const tg = (window as any).Telegram?.WebApp
    if (tg?.openTelegramLink) {
      // Share via Telegram native share
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('🛡 Попробуй PrivatVPN бесплатно — стабильный VPN для комфортного интернета!')}`
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
      <AnimatedItem className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Рефералы</h1>
          <p className="text-xs text-muted-foreground">Бонус за каждого друга</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/50 text-primary">
          <Users className="h-5 w-5" />
        </div>
      </AnimatedItem>

      <AnimatedItem className="mt-5">
        <div className="grain-surface relative overflow-hidden rounded-[26px] border border-border/80 bg-card/95 p-5 shadow-[0_24px_60px_-45px_rgba(0,0,0,0.85)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(120,130,255,0.09),transparent_48%)]" />
          <img
            src="/images/referral-hero.gif"
            alt=""
            className="pointer-events-none absolute -right-10 top-0 h-full w-[56%] object-contain opacity-60 rotate-[8deg]"
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-[66%]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                  Реферальная программа
                </p>
                <h2 className="mt-2 text-lg font-bold text-foreground">+30 ₽ за каждого друга</h2>
                <p className="mt-1 text-xs text-muted-foreground">Бонус начисляется после первой оплаты.</p>
              </div>
            </div>
          </div>
        </div>
      </AnimatedItem>

      <AnimatedItem className="mt-4 grid grid-cols-3 gap-2">
        <div className="grain-surface rounded-2xl border border-border/80 bg-card/95 p-3 text-center">
          <Users className="mx-auto mb-2 h-4 w-4 text-primary" />
          <p className="text-lg font-black text-foreground">{referralsCount}</p>
          <p className="text-[10px] text-muted-foreground">Приглашено</p>
        </div>
        <div className="grain-surface rounded-2xl border border-border/80 bg-card/95 p-3 text-center">
          <Wallet className="mx-auto mb-2 h-4 w-4 text-primary" />
          <p className="text-lg font-black text-foreground">{totalEarned}</p>
          <p className="text-[10px] text-muted-foreground">Заработано</p>
        </div>
        <div className="grain-surface rounded-2xl border border-border/80 bg-card/95 p-3 text-center">
          <Clock3 className="mx-auto mb-2 h-4 w-4 text-primary" />
          <p className="text-lg font-black text-foreground">{pendingEarned}</p>
          <p className="text-[10px] text-muted-foreground">В ожидании</p>
        </div>
      </AnimatedItem>

      <AnimatedItem className="mt-4">
        <div className="rounded-2xl border border-border/80 bg-card/95 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Share2 className="h-4 w-4" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em]">Ссылка для приглашения</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl border border-border bg-card/80 px-3 py-3 font-mono text-xs text-foreground/85">
              {refLink}
            </code>
            <button
              onClick={handleCopy}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/50 text-foreground transition-colors hover:bg-secondary/70"
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-3">
            <button
              onClick={handleShare}
              className="flex w-full items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3 text-left text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              <div>
                <p className="text-sm font-semibold">Поделиться ссылкой</p>
                <p className="text-[11px] text-primary-foreground/70">Отправить другу в Telegram</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                <Share2 className="h-4 w-4" />
              </div>
            </button>
          </div>
        </div>
      </AnimatedItem>

      <AnimatedItem className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">История приглашений</h2>
      </AnimatedItem>
      <AnimatedItem>
        {!user.referrals || user.referrals.length === 0 ? (
          <div className="grain-surface rounded-2xl border border-border/80 bg-card/95 p-6 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Пока нет приглашений</p>
            <p className="mt-1 text-xs text-muted-foreground">Поделись ссылкой, чтобы получить бонусы</p>
          </div>
        ) : (
          <div className="space-y-3">
            {user.referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between rounded-2xl border border-border/80 bg-card/95 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
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
                  <p className="text-sm font-bold text-foreground">+{ref.reward} {'\u20BD'}</p>
                  <span
                    className={cn(
                      'mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase',
                      ref.status === 'credited'
                        ? 'border-primary/20 bg-primary/10 text-primary'
                        : 'border-border bg-secondary/40 text-muted-foreground'
                    )}
                  >
                    {ref.status === 'credited' ? 'Начислено' : 'В ожидании'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </AnimatedItem>

      <AnimatedItem className="mt-4 rounded-2xl border border-border/80 bg-card/95 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Баланс: {totalEarned} {'\u20BD'}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Используется при оплате тарифа</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
        </div>
      </AnimatedItem>
    </AnimatedContainer>
  )
}
