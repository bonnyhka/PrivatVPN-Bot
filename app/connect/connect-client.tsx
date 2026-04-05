'use client'

import { useSearchParams } from 'next/navigation'
import { Shield, Smartphone, ArrowLeft, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function ConnectClient() {
  const searchParams = useSearchParams()
  const subUrl = searchParams.get('url') || ''
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (subUrl) {
      navigator.clipboard.writeText(subUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const apps = [
    {
      name: 'Hiddify',
      os: 'Универсальное (iOS, Android, PC)',
      schema: `hiddify://install-config?url=${encodeURIComponent(subUrl)}`,
      color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
    },
    {
      name: 'Happ',
      os: 'Универсальное (iOS, Mac, Android, PC)',
      schema: `happ://add/${subUrl}`,
      color: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
    }
  ]

  if (!subUrl) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Ошибка конфигурации</h1>
        <p className="mt-2 text-sm text-muted-foreground">Не передан ключ подписки. Вернитесь в Telegram бота и нажмите кнопку заново.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md min-h-screen p-6 pb-12">
      <div className="mb-8 flex flex-col items-center text-center mt-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 mb-4 shadow-xl shadow-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Настройка VPN</h1>
        <p className="mt-2 text-sm text-muted-foreground px-4">
          Выберите приложение, которое у вас установлено, чтобы в 1 клик добавить конфигурацию
        </p>
      </div>

      <div className="space-y-3">
        {apps.map((app) => (
          <a
            key={app.name}
            href={app.schema}
            className={`group flex items-center justify-between rounded-2xl border ${app.color} p-4 transition-all hover:bg-card hover:shadow-md active:scale-95`}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/50 backdrop-blur-sm">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="font-bold">{app.name}</h3>
                <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{app.os}</p>
              </div>
            </div>
            <div className="rounded-full bg-background/50 px-3 py-1 text-[10px] font-bold">
              Подключить
            </div>
          </a>
        ))}
      </div>

      {/* Manual Link Section */}
      <div className="mt-10 rounded-2xl border border-border bg-secondary/30 p-5">
        <h3 className="text-sm font-bold text-foreground">Ручная настройка</h3>
        <p className="mt-1 text-xs text-muted-foreground mb-4">Если кнопки выше не срабатывают, скопируйте ссылку и вставьте её в приложение.</p>
        <div className="flex items-center gap-2 rounded-xl bg-background p-2 border border-border">
          <code className="flex-1 truncate font-mono text-xs text-primary px-2">
            {subUrl}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
