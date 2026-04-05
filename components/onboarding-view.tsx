'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Headphones, Smartphone, Zap, CheckCircle2, ArrowRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingViewProps {
  onComplete: () => void
}

const SLIDES = [
  {
    id: 'welcome',
    title: 'Добро пожаловать в PrivatVPN!',
    description: 'Ваш личный шлюз в безопасный и свободный интернет без границ.',
    icon: Shield,
    color: 'text-primary',
    bg: 'bg-primary/10'
  },
  {
    id: 'nodes',
    title: 'Премиальные узлы',
    description: 'Прямые каналы до Европы (Германия, Нидерланды) с минимальным пингом и широкой полосой.',
    icon: Zap,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10'
  },
  {
    id: 'devices',
    title: 'Умный контроль устройств',
    description: 'Мы честно считаем только реально активные сессии. Подключайте до 5 устройств одновременно.',
    icon: Smartphone,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10'
  },
  {
    id: 'support',
    title: 'Поддержка 24/7',
    description: 'Помощь — это самое важное для нас. Мы всегда на связи в разделе «Поддержка», чтобы решить любой вопрос.',
    icon: Headphones,
    color: 'text-green-500',
    bg: 'bg-green-500/10'
  }
]

export function OnboardingView({ onComplete }: OnboardingViewProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1)
    } else {
      onComplete()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl px-6">
      <div className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border border-border bg-card p-8 shadow-2xl shadow-primary/20">
        <button 
          onClick={onComplete}
          className="absolute right-6 top-6 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <div className={cn(
              "mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] shadow-inner",
              SLIDES[currentSlide].bg
            )}>
              {(() => {
                const Icon = SLIDES[currentSlide].icon
                return <Icon className={cn("h-10 w-10", SLIDES[currentSlide].color)} />
              })()}
            </div>

            <h2 className="mb-4 text-2xl font-black text-foreground">
              {SLIDES[currentSlide].title}
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
              {SLIDES[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <div 
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentSlide ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95"
          >
            {currentSlide === SLIDES.length - 1 ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <ArrowRight className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
