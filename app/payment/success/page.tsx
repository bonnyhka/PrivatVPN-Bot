'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Smartphone } from 'lucide-react'

export default function PaymentSuccessPage() {
  const [status, setStatus] = useState<'verifying' | 'success'>('verifying')

  useEffect(() => {
    // Simulate a brief verification period before showing success
    const timer = setTimeout(() => {
      setStatus('success')
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-background text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        {status === 'verifying' ? (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Проверяем оплату...</h1>
            <p className="mt-2 text-muted-foreground">
              Это займёт всего несколько секунд. Не закрывайте страницу.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Оплата принята!</h1>
            <p className="mt-2 text-muted-foreground">
              Ваша подписка активирована. Вы можете вернуться в бот или перейти в личный кабинет.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
              >
                Вернуться в приложение
              </a>
              <p className="text-[10px] text-muted-foreground">
                Если подписка не обновилась сразу, подождите 1-2 минуты.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
