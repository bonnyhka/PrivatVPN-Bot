'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface AppErrorBoundaryProps {
  children: React.ReactNode
  onReset: () => void
}

interface AppErrorBoundaryState {
  hasError: boolean
}

function isRecoverableChunkError(error?: Error | null) {
  const text = `${error?.message || ''} ${error?.stack || ''}`.toLowerCase()
  return (
    text.includes('chunkloaderror') ||
    text.includes('failed to load chunk') ||
    text.includes('asset load error') ||
    text.includes('/_next/static/') ||
    text.includes('failed to fetch dynamically imported module')
  )
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AppErrorBoundary] client render error:', error, errorInfo)
    try {
      const payload = JSON.stringify({
        type: 'react-error-boundary',
        message: String(error?.message || 'Unknown React render error'),
        stack: [error?.stack, errorInfo?.componentStack].filter(Boolean).join('\n\n'),
        source: 'AppErrorBoundary',
        lineno: null,
        colno: null,
        href: typeof window !== 'undefined' ? window.location.href : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        timestamp: new Date().toISOString(),
      })

      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/client-error', blob)
      } else if (typeof fetch !== 'undefined') {
        fetch('/api/client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      }
    } catch {}

    if (typeof window !== 'undefined' && isRecoverableChunkError(error)) {
      try {
        const reloadKey = 'privatvpn_boundary_reload_v1'
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, String(Date.now()))
          const nextUrl = new URL(window.location.href)
          nextUrl.searchParams.set('__miniapp_chunk_reload', String(Date.now()))
          window.location.replace(nextUrl.toString())
          return
        }
      } catch {}
    }
  }

  handleReset = () => {
    this.setState({ hasError: false })
    try {
      localStorage.removeItem('privatvpn_current_view')
      localStorage.removeItem('privatvpn_current_view_v2')
    } catch {}
    try {
      sessionStorage.removeItem('privatvpn_asset_reload_count_v2')
      sessionStorage.removeItem('privatvpn_boundary_reload_v1')
    } catch {}
    try {
      if (typeof window !== 'undefined') {
        const nextUrl = new URL(window.location.href)
        nextUrl.searchParams.set('__miniapp_reset', String(Date.now()))
        window.location.replace(nextUrl.toString())
        return
      }
    } catch {}
    this.props.onReset()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-3xl border border-red-500/20 bg-card p-6 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">Интерфейс временно сбился</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Мы поймали клиентскую ошибку и можем безопасно вернуть приложение на главную страницу.
          </p>
          <button
            onClick={this.handleReset}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.99]"
          >
            <RefreshCw className="h-4 w-4" />
            Открыть заново
          </button>
        </div>
      </div>
    )
  }
}
