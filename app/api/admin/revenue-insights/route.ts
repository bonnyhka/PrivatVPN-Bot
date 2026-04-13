import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  getPaymentProviderId,
  getPaymentProviderLabel,
  isCryptoPaymentProvider,
  SUCCESSFUL_PAYMENT_STATUSES,
} from '@/lib/payments'

export const dynamic = 'force-dynamic'

function getMonthKey(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, 1))
  return new Intl.DateTimeFormat('ru-RU', { month: 'short', year: 'numeric' }).format(date)
}

function parseMonthParam(value: string | null, fallbackOffset = 0) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, 1))
  }

  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + fallbackOffset, 1))
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
}

function clampMonthRange(start: Date, end: Date) {
  if (start.getTime() <= end.getTime()) {
    return { start, end }
  }

  return { start: end, end: start }
}

export async function GET(req: Request) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const defaultTo = parseMonthParam(null, 0)
    const defaultFrom = addMonths(defaultTo, -5)
    const requestedFrom = parseMonthParam(searchParams.get('from'), -5)
    const requestedTo = parseMonthParam(searchParams.get('to'), 0)
    const { start, end } = clampMonthRange(requestedFrom, requestedTo)
    const rangeStart = start
    const rangeEndExclusive = addMonths(end, 1)

    const payments = await prisma.payment.findMany({
      where: {
        status: { in: SUCCESSFUL_PAYMENT_STATUSES as any },
        createdAt: {
          gte: rangeStart,
          lt: rangeEndExclusive,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        planId: true,
        months: true,
        externalId: true,
        createdAt: true,
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
            telegramId: true,
          },
        },
      },
    })

    const monthKeys: string[] = []
    for (let cursor = new Date(rangeStart); cursor < rangeEndExclusive; cursor = addMonths(cursor, 1)) {
      monthKeys.push(getMonthKey(cursor))
    }

    const monthBuckets = new Map(
      monthKeys.map((monthKey) => [
        monthKey,
        {
          month: monthKey,
          label: getMonthLabel(monthKey),
          total: 0,
          crypto: 0,
          providers: {
            heleket: 0,
            crystalpay: 0,
            yoomoney: 0,
            manual: 0,
            internal: 0,
            unknown: 0,
          },
        },
      ]),
    )

    const providerBuckets = new Map<
      string,
      { providerId: string; label: string; revenue: number; count: number; isCrypto: boolean }
    >()

    let totalRevenue = 0
    let cryptoRevenue = 0
    let successfulCount = 0

    for (const payment of payments) {
      const providerId = getPaymentProviderId(payment.externalId)
      const providerLabel = getPaymentProviderLabel(providerId)
      const amount = Number(payment.amount || 0)
      const monthKey = getMonthKey(new Date(payment.createdAt))
      const monthBucket = monthBuckets.get(monthKey)
      const isCrypto = isCryptoPaymentProvider(providerId)

      totalRevenue += amount
      successfulCount += 1
      if (isCrypto) cryptoRevenue += amount

      if (monthBucket) {
        monthBucket.total += amount
        if (isCrypto) monthBucket.crypto += amount
        monthBucket.providers[providerId] += amount
      }

      const providerBucket = providerBuckets.get(providerId) || {
        providerId,
        label: providerLabel,
        revenue: 0,
        count: 0,
        isCrypto,
      }
      providerBucket.revenue += amount
      providerBucket.count += 1
      providerBuckets.set(providerId, providerBucket)
    }

    const averageCheck = successfulCount > 0 ? totalRevenue / successfulCount : 0
    const cryptoShare = totalRevenue > 0 ? (cryptoRevenue / totalRevenue) * 100 : 0

    return NextResponse.json({
      range: {
        from: getMonthKey(rangeStart),
        to: getMonthKey(end),
      },
      totals: {
        totalRevenue,
        cryptoRevenue,
        cryptoShare,
        successfulCount,
        averageCheck,
      },
      providers: Array.from(providerBuckets.values()).sort((a, b) => b.revenue - a.revenue),
      monthly: Array.from(monthBuckets.values()),
      recentPayments: payments.slice(0, 20).map((payment) => {
        const providerId = getPaymentProviderId(payment.externalId)
        return {
          id: payment.id,
          amount: Number(payment.amount || 0),
          planId: payment.planId,
          months: payment.months,
          createdAt: payment.createdAt,
          providerId,
          providerLabel: getPaymentProviderLabel(providerId),
          user: {
            username: payment.user?.username || null,
            displayName:
              [payment.user?.firstName, payment.user?.lastName].filter(Boolean).join(' ').trim() ||
              (payment.user?.username ? `@${payment.user.username}` : '') ||
              (payment.user?.telegramId ? String(payment.user.telegramId) : 'user'),
          },
        }
      }),
      defaults: {
        from: getMonthKey(defaultFrom),
        to: getMonthKey(defaultTo),
      },
    })
  } catch (error) {
    console.error('Revenue insights error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
