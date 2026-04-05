'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  targetId: string
  title: string
  description: string
  position: 'top' | 'bottom' | 'middle'
}

const STEPS: Step[] = [
  {
    id: 'header',
    targetId: 'header-profile',
    title: 'Ваш профиль',
    description: 'Здесь можно увидеть ваш аватар и логин Telegram.',
    position: 'bottom'
  },
  {
    id: 'sub',
    targetId: 'sub-card',
    title: 'Ваш VPN',
    description: 'Тут находится ваш ключ доступа и статус подписки.',
    position: 'bottom'
  },
  {
    id: 'support',
    targetId: 'header-support',
    title: 'Поддержка 24/7',
    description: 'Возникли вопросы? Наша команда всегда на связи, чтобы помочь вам с настройкой.',
    position: 'bottom'
  }
]

export function GuideTour({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 })

  useEffect(() => {
    const updateCoords = () => {
      const step = STEPS[currentStep]
      const el = document.getElementById(step.targetId)
      if (el) {
        const rect = el.getBoundingClientRect()
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        })
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    updateCoords()
    window.addEventListener('resize', updateCoords)
    return () => window.removeEventListener('resize', updateCoords)
  }, [currentStep])

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    } else {
      onComplete()
    }
  }

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Dark Overlay with subtraction (shutter effect) */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] pointer-events-auto" />
      
      {/* Highlight Box */}
      <motion.div
        animate={{
          top: coords.top - 8,
          left: coords.left - 8,
          width: coords.width + 16,
          height: coords.height + 16
        }}
        className="absolute z-[210] rounded-2xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-all pointer-events-none"
      />

      {/* Popover */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            top: STEPS[currentStep].position === 'bottom' ? coords.top + coords.height + 24 : coords.top - 160,
            left: Math.max(16, Math.min(window.innerWidth - 316, coords.left + coords.width / 2 - 150))
          }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          className="absolute z-[220] w-[300px] pointer-events-auto rounded-[2rem] border border-border bg-card p-6 shadow-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Info className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-foreground">{STEPS[currentStep].title}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {STEPS[currentStep].description}
              </p>
            </div>
          </div>
          
          <div className="mt-5 flex items-center justify-between">
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <div key={i} className={cn("h-1 w-4 rounded-full transition-all", i === currentStep ? "bg-primary" : "bg-muted-foreground/20")} />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[11px] font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
              {currentStep === STEPS.length - 1 ? 'Понятно!' : 'Далее'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          <button 
            onClick={onComplete}
            className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground shadow-lg backdrop-blur-md transition-all hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
