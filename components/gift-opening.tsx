'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Check, Crown, Gem, Gift, Loader2, Shield, Star, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLANS } from '@/lib/store'
import { useTelegramUser } from './providers/telegram-provider'

type TierTheme = {
  color: string
  accent: string
  frame: string
  panel: string
  halo: string
  badge: string
  icon: LucideIcon
  particles: string[]
}

const TIER_STYLES: Record<string, TierTheme> = {
  citadel: {
    color: '#f5b241',
    accent: '#ffe09a',
    frame: 'linear-gradient(135deg, rgba(255,196,78,0.96), rgba(110,63,10,0.75) 46%, rgba(255,221,149,0.98))',
    panel: 'radial-gradient(circle at top right, rgba(255,205,112,0.22), transparent 42%), linear-gradient(160deg, rgba(69,39,10,0.97), rgba(22,13,5,0.99))',
    halo: 'rgba(245,178,65,0.32)',
    badge: 'VIP',
    icon: Crown,
    particles: ['#f5b241', '#ffe09a', '#fff2ce']
  },
  fortress: {
    color: '#9d7cff',
    accent: '#ddd1ff',
    frame: 'linear-gradient(135deg, rgba(161,132,255,0.96), rgba(61,35,135,0.78) 46%, rgba(218,207,255,0.98))',
    panel: 'radial-gradient(circle at top right, rgba(170,149,255,0.22), transparent 42%), linear-gradient(160deg, rgba(32,18,72,0.97), rgba(12,8,28,0.99))',
    halo: 'rgba(157,124,255,0.3)',
    badge: 'MAX',
    icon: Shield,
    particles: ['#9d7cff', '#c7b7ff', '#ffffff']
  },
  guardian: {
    color: '#37d8ef',
    accent: '#b7f7ff',
    frame: 'linear-gradient(135deg, rgba(68,230,255,0.96), rgba(9,82,94,0.78) 46%, rgba(178,248,255,0.98))',
    panel: 'radial-gradient(circle at top right, rgba(78,225,244,0.22), transparent 42%), linear-gradient(160deg, rgba(7,48,56,0.97), rgba(3,18,22,0.99))',
    halo: 'rgba(55,216,239,0.28)',
    badge: 'CORE',
    icon: Star,
    particles: ['#37d8ef', '#8deefc', '#ffffff']
  },
  scout: {
    color: '#bac4d2',
    accent: '#edf2f9',
    frame: 'linear-gradient(135deg, rgba(204,213,225,0.96), rgba(77,88,106,0.78) 46%, rgba(244,247,251,0.98))',
    panel: 'radial-gradient(circle at top right, rgba(195,204,216,0.2), transparent 42%), linear-gradient(160deg, rgba(49,57,68,0.97), rgba(14,18,24,0.99))',
    halo: 'rgba(186,196,210,0.24)',
    badge: 'EDGE',
    icon: Zap,
    particles: ['#bac4d2', '#d9e2ee', '#ffffff']
  }
}

function formatTrafficLabel(trafficLimit?: number) {
  if (!trafficLimit || trafficLimit === Number.MAX_SAFE_INTEGER) return 'Безлимит'
  return `${Math.round(trafficLimit / 1024 / 1024 / 1024)} ГБ`
}

function formatDurationLabel(periodMonths?: number) {
  if (!periodMonths) return '30 дней'
  return `${periodMonths * 30} дней`
}

export function GiftOpening() {
  const { user, refreshUser } = useTelegramUser()
  const [gift, setGift] = useState<{ id: string; planId: string; isTest?: boolean } | null>(null)
  const [stage, setStage] = useState<'closed' | 'shaking' | 'burst' | 'revealed' | 'success'>('closed')
  const [isOpening, setIsOpening] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const shownGiftIds = useRef<Set<string>>(new Set())

  const burstParticles = useRef(
    Array.from({ length: 28 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 28
      const distance = 68 + (index % 5) * 18
      return {
        id: index,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        scale: 0.65 + (index % 4) * 0.18,
        rotate: index * 19,
        delay: index * 0.02
      }
    })
  ).current

  const frameMarks = useRef(
    Array.from({ length: 18 }, (_, index) => ({
      id: index,
      left: 8 + (index % 6) * 16 + (index % 2 === 0 ? 0 : 3),
      top: 12 + Math.floor(index / 6) * 26 + (index % 3 === 0 ? 2 : 0),
      size: index % 4 === 0 ? 12 : 10,
      opacity: index % 3 === 0 ? 0.28 : 0.14
    }))
  ).current

  useEffect(() => {
    const checkGift = async () => {
      try {
        const res = await fetch('/api/user/gift/check')
        if (!res.ok) return

        const data = await res.json()
        const nextGift = data.id ? data : data.gift
        if (!nextGift?.id || shownGiftIds.current.has(nextGift.id)) return

        shownGiftIds.current.add(nextGift.id)
        setGift(nextGift)
        setIsOpening(true)
        setStage('closed')
        setTimeout(() => setStage('shaking'), 700)
      } catch (err) {
        console.error('Failed to check gift:', err)
      }
    }

    if (!user) return

    checkGift()
    const interval = setInterval(checkGift, 10000)
    return () => clearInterval(interval)
  }, [user])

  const handleBurst = () => {
    setStage('burst')
    setTimeout(() => setStage('revealed'), 420)
  }

  const handleClaim = async () => {
    if (!gift) return

    setIsClaiming(true)
    try {
      const res = await fetch('/api/user/gift/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId: gift.id })
      })

      if (res.ok) {
        setStage('success')
        await refreshUser()

        setTimeout(() => {
          setIsOpening(false)
          setGift(null)
          setStage('closed')
        }, 2600)
      }
    } catch (err) {
      console.error('Failed to claim gift:', err)
    } finally {
      setIsClaiming(false)
    }
  }

  if (!isOpening || !gift) return null

  const plan = PLANS.find((item) => item.id === gift.planId)
  const theme = TIER_STYLES[gift.planId] || TIER_STYLES.scout
  const TierIcon = theme.icon
  const badgeLabel = plan?.badge || theme.badge
  const summaryItems = [
    formatDurationLabel(plan?.periodMonths),
    plan?.speedLabel || 'VPN доступ',
    formatTrafficLabel(plan?.trafficLimit)
  ]

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden bg-black/72 px-4 backdrop-blur-md"
      >
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${theme.halo} 0%, rgba(0,0,0,0) 36%), linear-gradient(180deg, rgba(4,6,10,0.22), rgba(0,0,0,0.72))`
          }}
        />

        <div className="relative w-full max-w-[356px]" style={{ perspective: 1400 }}>
          {(stage === 'burst' || stage === 'revealed' || stage === 'success') && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
              {burstParticles.map((particle, index) => (
                <motion.div
                  key={particle.id}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0.95 }}
                  animate={{
                    x: particle.x,
                    y: particle.y,
                    scale: particle.scale,
                    opacity: 0,
                    rotate: particle.rotate
                  }}
                  transition={{ duration: 1.15, ease: 'easeOut', delay: particle.delay }}
                  className={cn(
                    'absolute rounded-full',
                    index % 4 === 0 ? 'h-2.5 w-2.5' : 'h-1.5 w-1.5'
                  )}
                  style={{ backgroundColor: theme.particles[index % theme.particles.length] }}
                />
              ))}
            </div>
          )}

          {(stage === 'closed' || stage === 'shaking') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={
                stage === 'shaking'
                  ? {
                      scale: [1, 1.03, 1.01, 1.06],
                      rotate: [0, -2.5, 2.5, -1.5, 1.5, 0]
                    }
                  : { opacity: 1, scale: 1, rotate: 0 }
              }
              transition={
                stage === 'shaking'
                  ? {
                      duration: 1.35,
                      ease: 'easeInOut',
                      times: [0, 0.28, 0.6, 1]
                    }
                  : { duration: 0.45, ease: 'easeOut' }
              }
              onAnimationComplete={() => {
                if (stage === 'shaking') handleBurst()
              }}
              className="flex flex-col items-center"
            >
              <div className="relative w-full rounded-[32px] p-[1.5px]" style={{ background: theme.frame }}>
                <div
                  className="relative overflow-hidden rounded-[30px] border border-white/10 px-5 py-5"
                  style={{ background: theme.panel }}
                >
                  <motion.div
                    animate={{ opacity: [0.26, 0.52, 0.3], scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(circle at 50% 42%, ${theme.halo} 0%, rgba(0,0,0,0) 56%)`
                    }}
                  />

                  <div className="relative flex items-center gap-4">
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      style={{ boxShadow: `0 18px 40px -24px ${theme.halo}` }}
                    >
                      <Gift className="h-8 w-8 text-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/45">
                        Gift incoming
                      </p>
                      <h2 className="mt-2 text-[24px] font-black leading-none tracking-tight text-white">
                        Вам отправили подарок
                      </h2>
                      <p className="mt-2 text-sm text-white/65">
                        Открываем подарок и показываем ваш тариф в новом оформлении.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'burst' && (
            <>
              <motion.div
                initial={{ scale: 0.3, opacity: 0.95 }}
                animate={{ scale: 2.7, opacity: 0 }}
                transition={{ duration: 0.42, ease: 'easeOut' }}
                className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: `radial-gradient(circle, ${theme.accent} 0%, rgba(255,255,255,0) 72%)` }}
              />
              <motion.div
                initial={{ scale: 0.6, opacity: 0.8 }}
                animate={{ scale: 1.9, opacity: 0 }}
                transition={{ duration: 0.38, ease: 'easeOut' }}
                className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full border"
                style={{ borderColor: `${theme.color}66` }}
              />
            </>
          )}

          {(stage === 'revealed' || stage === 'success') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.82, rotateX: -20, filter: 'blur(12px)' }}
              animate={{ opacity: 1, scale: 1, rotateX: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="relative w-full">
                <div
                  className="absolute inset-[-10px] rounded-[34px] blur-2xl"
                  style={{ background: `radial-gradient(circle, ${theme.halo} 0%, rgba(0,0,0,0) 72%)` }}
                />

                <div className="relative rounded-[30px] p-[1.5px]" style={{ background: theme.frame }}>
                  <div
                    className="relative overflow-hidden rounded-[28px] border border-white/10 px-4 py-4"
                    style={{ background: theme.panel }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent 30%, transparent)' }}
                    />

                    <motion.div
                      aria-hidden
                      className="absolute -left-1/3 top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60"
                      animate={{ x: ['0%', '310%'] }}
                      transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.1, ease: 'easeInOut' }}
                    />

                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      {frameMarks.map((mark) => (
                        <span
                          key={mark.id}
                          className="absolute font-black leading-none"
                          style={{
                            left: `${mark.left}%`,
                            top: `${mark.top}%`,
                            fontSize: `${mark.size}px`,
                            opacity: mark.opacity,
                            color: theme.accent
                          }}
                        >
                          +
                        </span>
                      ))}
                    </div>

                    <div className="relative flex items-center gap-4">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        style={{ boxShadow: `0 16px 36px -24px ${theme.halo}` }}
                      >
                        <Gem className="h-6 w-6" style={{ color: theme.color }} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/42">
                              Подарочный тариф
                            </p>
                            <h2 className="mt-1 truncate text-[31px] font-black leading-none tracking-tight text-white">
                              {plan?.name || 'VPN Gift'}
                            </h2>
                          </div>

                          <span
                            className="mt-1 inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em]"
                            style={{
                              backgroundColor: `${theme.color}26`,
                              color: theme.accent,
                              border: `1px solid ${theme.color}33`
                            }}
                          >
                            {badgeLabel}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-white/68">
                          <TierIcon className="h-3.5 w-3.5 shrink-0" style={{ color: theme.color }} />
                          <span className="truncate">
                            {summaryItems[0]} • {summaryItems[1]} • {summaryItems[2]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex w-full flex-wrap justify-center gap-2">
                {summaryItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/78"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-5 w-full">
                {stage === 'success' ? (
                  <motion.div
                    initial={{ scale: 0.94, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/20 text-base font-black text-emerald-100"
                  >
                    <Check className="h-5 w-5" />
                    Подарок активирован
                  </motion.div>
                ) : (
                  <button
                    onClick={handleClaim}
                    disabled={isClaiming}
                    className="group relative h-14 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] text-base font-black text-white transition-all duration-300 hover:scale-[1.01] hover:bg-white/10 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div
                      className="absolute inset-0 opacity-75 transition-opacity duration-300 group-hover:opacity-100"
                      style={{
                        background: `linear-gradient(135deg, ${theme.color}24, transparent 48%, ${theme.color}16)`
                      }}
                    />
                    <span className="relative flex items-center justify-center gap-2">
                      {isClaiming ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Забрать подарок'}
                    </span>
                  </button>
                )}
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                onClick={() => setIsOpening(false)}
                className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-white/32 transition-colors hover:text-white/62"
              >
                Закрыть окно
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </AnimatePresence>
  )
}
