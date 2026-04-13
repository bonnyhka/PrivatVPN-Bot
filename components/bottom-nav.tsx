'use client'

import { House, CreditCard, Key, Users, Headphones, Settings, ShoppingBag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AppView, UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  currentView: AppView
  onNavigate: (view: AppView) => void
  userRole: UserRole
}

const BASE_ITEMS: { view: AppView; label: string; icon: LucideIcon }[] = [
  { view: 'home', label: 'Главная', icon: House },
  { view: 'plans', label: 'Тарифы', icon: CreditCard },
  { view: 'my-vpn', label: 'Мой VPN', icon: Key },
  { view: 'referral', label: 'Рефералы', icon: Users },
]

export function BottomNav({ currentView, onNavigate, userRole }: BottomNavProps) {
  const showMarket = userRole === 'admin' || userRole === 'owner'

  let mainItems = [...BASE_ITEMS]
  if (userRole === 'admin' || userRole === 'owner') {
    mainItems.push({ view: 'admin' as AppView, label: 'Админ', icon: Settings })
  } else if (userRole === 'support') {
    mainItems.push({ view: 'admin-support' as AppView, label: 'Тикеты', icon: Headphones })
  }

  // Скрываем только полноэкранные разделы; подстраницы админки (admin-security и т.д.) оставляем с «Админ» в таббаре
  const isHidden =
    currentView === 'market' ||
    currentView === 'admin-orders' ||
    currentView === 'admin-support'

  return (
    <div className={cn(
      "fixed left-4 right-4 z-[70] pointer-events-none flex justify-center gap-2 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
      isHidden ? "bottom-[-100px] opacity-0 scale-95" : "bottom-4 opacity-100 scale-100"
    )}>
      <nav className="pointer-events-auto w-full max-w-[320px] rounded-[2rem] border border-white/10 bg-[#121212]/90 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl p-1.5 flex items-center justify-around">
        {mainItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.view || (item.view === 'admin' && currentView.startsWith('admin'))
          return (
              <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-[1.5rem] w-[54px] h-[54px] text-[10px] transition-all duration-300',
                isActive ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
              <span className="font-medium tracking-tight leading-none">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {showMarket && (
        <button
          onClick={() => onNavigate('market')}
          className={cn(
            "pointer-events-auto h-[66px] aspect-square rounded-[2rem] border flex flex-col items-center justify-center gap-1 text-[9px] uppercase font-black transition-all duration-300 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-3xl shrink-0 tracking-widest leading-none",
            currentView === 'market' 
              ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" 
              : "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 hover:scale-105"
          )}
        >
          <ShoppingBag className="h-6 w-6 mb-0.5" />
          <span>MARKET</span>
        </button>
      )}
    </div>
  )
}
