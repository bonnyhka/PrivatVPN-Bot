'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Clock3, Loader2 } from 'lucide-react'

type PaymentStatusView = 'checking' | 'pending' | 'success' | 'expired' | 'failed' | 'missing' | 'error'

function formatTimeLeft(expiresAt: string | null) {
  if (!expiresAt) return null

  const diffMs = new Date(expiresAt).getTime() - Date.now()
  if (diffMs <= 0) return '00:00'

  const totalSeconds = Math.ceil(diffMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('paymentId')
  const [status, setStatus] = useState<PaymentStatusView>(paymentId ? 'checking' : 'missing')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<string | null>(null)

  useEffect(() => {
    if (!paymentId) {
      setStatus('missing')
      return
    }

    if (status === 'success' || status === 'expired' || status === 'failed') {
      return
    }

    let cancelled = false

    const loadStatus = async () => {
      try {
        const res = await fetch(`/api/payments/${paymentId}/status`, { cache: 'no-store' })
        const data = await res.json()
        if (cancelled) return

        if (!res.ok && data?.status !== 'not_found') {
          setStatus('error')
          return
        }

        setExpiresAt(data?.expiresAt || null)

        if (data?.status === 'success') {
          setStatus('success')
          return
        }

        if (data?.status === 'expired') {
          setStatus('expired')
          return
        }

        if (data?.status === 'failed') {
          setStatus('failed')
          return
        }

        if (data?.status === 'not_found') {
          setStatus('missing')
          return
        }

        setStatus('pending')
      } catch (error) {
        if (!cancelled) {
          setStatus('error')
        }
      }
    }

    void loadStatus()
    const intervalId = setInterval(() => {
      void loadStatus()
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [paymentId, status])

  useEffect(() => {
    if (!expiresAt || status !== 'pending') {
      setTimeLeft(null)
      return
    }

    const update = () => setTimeLeft(formatTimeLeft(expiresAt))
    update()
    const intervalId = setInterval(update, 1000)
    return () => clearInterval(intervalId)
  }, [expiresAt, status])

  const cardClassName = status === 'success'
    ? 'border-green-500/30 bg-green-500/5'
    : status === 'expired'
      ? 'border-red-500/30 bg-red-500/5'
      : status === 'failed'
        ? 'border-red-500/30 bg-red-500/5'
      : 'border-border bg-card'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className={`w-full max-w-md rounded-2xl border p-8 text-center shadow-xl ${cardClassName}`}>
        {(status === 'checking' || status === 'pending') && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              {status === 'checking'
                ? <Loader2 className="h-10 w-10 animate-spin text-primary" />
                : <Clock3 className="h-10 w-10 text-primary" />}
            </div>
            <h1 className="mt-6 text-2xl font-bold">
              {status === 'checking' ? 'Проверяем оплату...' : 'Ожидаем подтверждение оплаты'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Мы ждём подтверждение от платёжного сервиса до 1 часа. Как только платёж подтвердится, подписка активируется автоматически.
            </p>
            {timeLeft && (
              <p className="mt-4 text-sm font-semibold text-primary">
                До авто-истечения: {timeLeft}
              </p>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Оплата подтверждена</h1>
            <p className="mt-2 text-muted-foreground">
              Подписка активирована. Можно возвращаться в приложение или бот.
            </p>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Платёж истёк</h1>
            <p className="mt-2 text-muted-foreground">
              Мы не получили подтверждение оплаты в течение 1 часа. Создай новый счёт и попробуй ещё раз.
            </p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Оплата не завершена</h1>
            <p className="mt-2 text-muted-foreground">
              Платёжная страница вернула ошибку или оплата была прервана. Создай новый счёт и попробуй ещё раз.
            </p>
          </>
        )}

        {(status === 'missing' || status === 'error') && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
              <AlertCircle className="h-10 w-10 text-amber-400" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">
              {status === 'missing' ? 'Платёж не найден' : 'Не удалось проверить платёж'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Вернись в приложение и открой оплату заново. Если деньги уже списались, лучше проверить уведомления в боте.
            </p>
          </>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
          >
            Вернуться в приложение
          </Link>
          <p className="text-[10px] text-muted-foreground">
            Страница больше не показывает успех без реального подтверждения платежа.
          </p>
        </div>
      </div>
    </div>
  )
}

function PaymentSuccessFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Подготавливаем проверку платежа...</h1>
        <p className="mt-2 text-muted-foreground">
          Ещё секунда, и мы покажем актуальный статус оплаты.
        </p>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessFallback />}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
