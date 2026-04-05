'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@/lib/types'

interface TelegramContextType {
  user: User | null
  setUser: (user: User | null) => void
  refreshUser: () => Promise<void>
  webApp: any | null
  isLoading: boolean
  error: string | null
}

const TelegramContext = createContext<TelegramContextType>({
  user: null,
  setUser: () => {},
  refreshUser: async () => {},
  webApp: null,
  isLoading: true,
  error: null,
})

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [webApp, setWebApp] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/user/me', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (data?.user) {
        setUser(data.user)
        setError(null)
      }
    } catch (err) {
      console.error('Refresh user error:', err)
    }
  }

  useEffect(() => {
    console.time('TG_PROVIDER_READY')
    const tg = (window as any).Telegram?.WebApp

    if (!tg) {
      setError('Telegram WebApp API не найден.')
      setIsLoading(false)
      return
    }

    setWebApp(tg)
    const backgroundColor = '#0b1218'
    const bottomBarColor = '#0e161d'

    try {
      tg.setBackgroundColor?.(backgroundColor)
      tg.setBottomBarColor?.(bottomBarColor)
      tg.setHeaderColor?.(backgroundColor)
      document.documentElement.style.setProperty('--tg-shell-color', backgroundColor)
      document.documentElement.style.setProperty('--tg-app-background', backgroundColor)
      document.documentElement.style.setProperty('--tg-bottom-bar-color', bottomBarColor)
      document.body.style.backgroundColor = backgroundColor
    } catch (uiError) {
      console.error('Telegram shell styling error:', uiError)
    }

    tg.expand()
    tg.ready()
    console.timeEnd('TG_PROVIDER_READY')

    const initData = tg.initData

    if (!initData) {
      setError('Не удалось получить данные Telegram. Откройте приложение внутри бота.')
      setIsLoading(false)
      return
    }

    // Optimistic: show basic user data from Telegram immediately!
    const tgUser = tg.initDataUnsafe?.user
    if (tgUser) {
      console.log('TG_USER found in initDataUnsafe')
      setUser({
        id: 'opt', // optimistic id
        telegramId: String(tgUser.id),
        username: tgUser.username || '',
        displayName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || 'User',
        avatar: tgUser.photo_url || undefined,
        role: 'user',
        createdAt: new Date().toISOString(),
        subscription: undefined,
        referralCode: undefined as any,
        referralsCount: 0,
        balance: 0,
      })
      setIsLoading(false)
    }

    console.time('AUTH_FETCH')
    fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    })
      .then(async (res) => {
        console.timeEnd('AUTH_FETCH')
        if (!res.ok) throw new Error('Auth failed')
        const data = await res.json()
        setUser(data.user)
        if (!tgUser) setIsLoading(false)
      })
      .catch((err) => {
        console.error('Auth error:', err)
        if (!tgUser) {
          setError('Ошибка при входе. Попробуйте перезапустить приложение.')
          setIsLoading(false)
        }
      })

    const handleFocusRefresh = () => {
      if (document.visibilityState === 'visible') {
        refreshUser()
      }
    }

    window.addEventListener('focus', handleFocusRefresh)
    document.addEventListener('visibilitychange', handleFocusRefresh)

    return () => {
      window.removeEventListener('focus', handleFocusRefresh)
      document.removeEventListener('visibilitychange', handleFocusRefresh)
    }
  }, [])

  return (
    <TelegramContext.Provider value={{ user, setUser, refreshUser, webApp, isLoading, error }}>
      {children}
    </TelegramContext.Provider>
  )
}

export const useTelegramUser = () => useContext(TelegramContext)
