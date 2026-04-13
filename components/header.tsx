'use client'

import { Headphones } from 'lucide-react'
import type { User, AppView } from '@/lib/types'

interface HeaderProps {
  user: User
  onNavigate: (view: AppView) => void
}

export function Header({ user, onNavigate }: HeaderProps) {
  return (
    <div
      className="mb-5 px-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 18px)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div id="header-profile" className="min-w-0 flex flex-1 items-center gap-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt={user.displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-primary/12 text-sm font-bold text-primary">
                {user.displayName?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.34em] text-primary/75">
              PrivatVPN
            </p>
            <h1 className="truncate pt-0.5 text-[17px] font-bold leading-tight text-foreground">
              {user.displayName}
            </h1>
            <p className="truncate pt-0.5 text-[12px] text-muted-foreground">
              @{user.username || 'user'}
            </p>
          </div>
        </div>

        <button
          id="header-support"
          onClick={() => onNavigate('support')}
          className="mt-3 flex shrink-0 items-center gap-2.5 rounded-[22px] border border-white/8 bg-white/5 px-3 py-2 text-[12px] font-medium text-muted-foreground backdrop-blur-md transition-colors hover:bg-white/7 hover:text-foreground"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 shadow-[0_0_10px_rgba(var(--primary),0.3)]">
            <Headphones className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="pr-1">Помощь</span>
        </button>
      </div>
    </div>
  )
}
