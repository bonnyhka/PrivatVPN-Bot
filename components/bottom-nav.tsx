'use client'

import { Shield, CreditCard, Key, Headphones, Settings } from 'lucide-react'
import type { AppView, UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  currentView: AppView
  onNavigate: (view: AppView) => void
  userRole: UserRole
}

const NAV_ITEMS: { view: AppView; label: string; icon: typeof Shield }[] = [
  { view: 'home', label: 'VPN', icon: Shield },
  { view: 'plans', label: 'Тарифы', icon: CreditCard },
  { view: 'my-vpn', label: 'Мой VPN', icon: Key },
  { view: 'support', label: 'Помощь', icon: Headphones },
]

export function BottomNav({ currentView, onNavigate, userRole }: BottomNavProps) {
  const items = userRole === 'admin' || userRole === 'owner'
    ? [...NAV_ITEMS, { view: 'admin' as AppView, label: 'Админ', icon: Settings }]
    : userRole === 'support'
    ? [...NAV_ITEMS, { view: 'admin-support' as AppView, label: 'Тикеты', icon: Settings }]
    : NAV_ITEMS

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.view ||
            (item.view === 'admin' && currentView.startsWith('admin'))
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs transition-all',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'drop-shadow-[0_0_6px_hsl(145,70%,45%)]')} />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <span className="mt-0.5 h-0.5 w-4 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
