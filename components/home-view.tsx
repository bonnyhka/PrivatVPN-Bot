'use client'

import { useState } from 'react'
import { Shield, Wifi, Globe, Zap, ChevronDown, Signal } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'
import { LOCATIONS } from '@/lib/store'

interface HomeViewProps {
  user: User
}

export function HomeView({ user }: HomeViewProps) {
  const [connected, setConnected] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0])
  const [showLocations, setShowLocations] = useState(false)
  const hasSubscription = user.subscription?.status === 'active'

  return (
    <div className="flex min-h-screen flex-col items-center px-4 pb-24 pt-6">
      {/* Header */}
      <div className="mb-8 flex w-full items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">GhostVPN</h1>
          <p className="text-xs text-muted-foreground">
            {hasSubscription
              ? `${user.subscription?.planId === 'turbo' ? 'Turbo' : user.subscription?.planId === 'phantom' ? 'Phantom' : user.subscription?.planId === 'ghost-year' ? 'Ghost Year' : 'Starter'}`
              : 'Нет подписки'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            'h-2 w-2 rounded-full',
            hasSubscription ? 'bg-primary' : 'bg-destructive'
          )} />
          <span className="text-xs text-muted-foreground">
            {hasSubscription ? 'Активен' : 'Неактивен'}
          </span>
        </div>
      </div>

      {/* Connection Button */}
      <div className="relative mb-8 flex flex-col items-center">
        <button
          onClick={() => hasSubscription && setConnected(!connected)}
          disabled={!hasSubscription}
          className={cn(
            'relative flex h-44 w-44 items-center justify-center rounded-full border-2 transition-all duration-500',
            connected
              ? 'border-primary bg-primary/10 glow-green'
              : hasSubscription
              ? 'border-border bg-secondary hover:border-primary/50'
              : 'cursor-not-allowed border-border/50 bg-secondary/50 opacity-60'
          )}
        >
          {connected && (
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 vpn-pulse" />
          )}
          <div className="flex flex-col items-center gap-2">
            <Shield className={cn(
              'h-12 w-12 transition-colors duration-500',
              connected ? 'text-primary drop-shadow-[0_0_12px_hsl(145,70%,45%)]' : 'text-muted-foreground'
            )} />
            <span className={cn(
              'text-sm font-semibold',
              connected ? 'text-primary' : 'text-muted-foreground'
            )}>
              {connected ? 'Защищено' : hasSubscription ? 'Подключить' : 'Нет подписки'}
            </span>
          </div>
        </button>
      </div>

      {/* Status Cards */}
      <div className="mb-6 grid w-full max-w-sm grid-cols-3 gap-3">
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-3">
          <Wifi className={cn('mb-1 h-4 w-4', connected ? 'text-primary' : 'text-muted-foreground')} />
          <span className="text-[10px] text-muted-foreground">Скорость</span>
          <span className={cn('text-sm font-bold', connected ? 'text-foreground' : 'text-muted-foreground')}>
            {connected ? '186 Мб/с' : '--'}
          </span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-3">
          <Zap className={cn('mb-1 h-4 w-4', connected ? 'text-primary' : 'text-muted-foreground')} />
          <span className="text-[10px] text-muted-foreground">Пинг</span>
          <span className={cn('text-sm font-bold', connected ? 'text-foreground' : 'text-muted-foreground')}>
            {connected ? `${selectedLocation.ping} мс` : '--'}
          </span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-3">
          <Globe className={cn('mb-1 h-4 w-4', connected ? 'text-primary' : 'text-muted-foreground')} />
          <span className="text-[10px] text-muted-foreground">Локация</span>
          <span className={cn('text-sm font-bold', connected ? 'text-foreground' : 'text-muted-foreground')}>
            {connected ? selectedLocation.flag : '--'}
          </span>
        </div>
      </div>

      {/* Server Selection */}
      <div className="w-full max-w-sm">
        <button
          onClick={() => setShowLocations(!showLocations)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-foreground">
              {selectedLocation.flag}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">{selectedLocation.country}</p>
              <p className="text-xs text-muted-foreground">Пинг: {selectedLocation.ping} мс</p>
            </div>
          </div>
          <ChevronDown className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            showLocations && 'rotate-180'
          )} />
        </button>

        {showLocations && (
          <div className="mt-2 space-y-1 rounded-xl border border-border bg-card p-2">
            {LOCATIONS.map((loc) => (
              <button
                key={loc.flag}
                onClick={() => {
                  setSelectedLocation(loc)
                  setShowLocations(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg p-3 transition-colors',
                  selectedLocation.flag === loc.flag
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-secondary'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{loc.flag}</span>
                  <span className="text-sm text-foreground">{loc.country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Signal className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{loc.ping} мс</span>
                  <div className={cn(
                    'h-1.5 w-8 rounded-full bg-secondary overflow-hidden'
                  )}>
                    <div
                      className={cn(
                        'h-full rounded-full',
                        loc.load < 40 ? 'bg-primary' : loc.load < 60 ? 'bg-yellow-500' : 'bg-orange-500'
                      )}
                      style={{ width: `${loc.load}%` }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
