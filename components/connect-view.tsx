'use client'

import { useState } from 'react'
import { ArrowLeft, Smartphone, Zap, Download, ExternalLink, ShieldCheck, Check } from 'lucide-react'
import type { User, AppView } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ConnectViewProps {
  user: User
  onNavigate: (view: AppView) => void
}

const APPS = [
  {
    id: 'hiddify',
    name: 'Hiddify',
    description: 'Рекомендуемое приложение для всех платформ. Поддерживает все современные протоколы.',
    icon: Zap,
    logoUrl: '/images/hiddify.png',
    logoClass: 'h-7 w-7 object-contain',
    color: 'text-primary',
    bg: 'bg-primary/5',
    platforms: ['Android', 'iOS', 'Windows', 'MacOS'],
    downloads: [
      { label: 'App Store', url: 'https://apps.apple.com/app/hiddify-proxy-vpn/id6477388862' },
      { label: 'Google Play', url: 'https://play.google.com/store/apps/details?id=app.hiddify.com' }
    ],
    setupUrl: 'hiddify://install-config?url='
  },
  {
    id: 'happ',
    name: 'HAPP',
    description: 'Оптимизировано для iOS и Android. Поддерживает VLESS и высокую скорость работы.',
    icon: ShieldCheck,
    logoUrl: '/images/happ.png',
    logoClass: 'h-full w-full object-cover',
    color: 'text-blue-500',
    bg: 'bg-blue-500/5',
    platforms: ['Android', 'Windows', 'MacOS', 'iOS'],
    downloads: [
      { label: 'Официальный сайт', url: 'https://happ.su' }
    ],
    setupUrl: 'happ://add/'
  }
]

export function ConnectView({ user, onNavigate }: ConnectViewProps) {
  const sub = user.subscription
  const [copied, setCopied] = useState<string | null>(null)

  const handleConnect = (app: typeof APPS[0]) => {
    if (!sub?.subscriptionUrl) return
    
    const url = sub.subscriptionUrl
    if (app.id === 'hiddify') {
      window.open(`hiddify://install-config?url=${encodeURIComponent(url)}#PrivatVPN`, '_blank')
    } else if (app.id === 'happ') {
      window.open(`happ://add/${url}`, '_blank')
    } else {
      window.open(url, '_blank')
    }
  }

  const handleCopy = () => {
    if (sub?.subscriptionUrl) {
      navigator.clipboard.writeText(sub.subscriptionUrl)
      setCopied('link')
      setTimeout(() => setCopied(null), 2000)
    }
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-6 bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => onNavigate('my-vpn')}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Подключение</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Выберите приложение</p>
        </div>
      </div>

      <div className="space-y-4">
        {APPS.map((app) => (
          <div 
            key={app.id}
            className="group relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 transition-all hover:border-primary/30"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl overflow-hidden shrink-0", app.bg)}>
                    {app.logoUrl ? (
                      <img src={app.logoUrl} alt={app.name} className={app.logoClass || 'h-7 w-7 object-contain'} />
                    ) : (
                      <app.icon className={cn("h-6 w-6", app.color)} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{app.name}</h3>
                    <div className="mt-1 flex gap-1">
                      {app.platforms.map(p => (
                        <span key={p} className="text-[9px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md uppercase">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground mb-6">
                {app.description}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleConnect(app)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Zap className="h-5 w-5 fill-current" />
                  Подключить автоматически
                </button>
                
                <div className="flex gap-2">
                  {app.downloads.map((dl) => (
                    <a
                      key={dl.label}
                      href={dl.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-[10px] font-bold text-muted-foreground transition-all hover:text-foreground hover:border-primary/30"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {dl.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center">
        <p className="text-xs text-muted-foreground mb-4">
          Если кнопка «Подключить» не срабатывает, скопируйте ссылку вручную и добавьте её в приложении (Import from URL).
        </p>
        <button
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 py-3 text-xs font-bold text-primary transition-all hover:bg-primary/10"
        >
          {copied === 'link' ? <Check className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
          {copied === 'link' ? 'Ссылка скопирована' : 'Скопировать ссылку подписки'}
        </button>
      </div>
    </div>
  )
}
