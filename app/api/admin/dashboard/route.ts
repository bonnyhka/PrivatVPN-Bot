import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getStartOfAppDay } from '@/lib/day-boundary'
import { readLocationDiagnosticsCache } from '@/lib/location-diagnostics'
import { readLocationTrafficAccounting } from '@/lib/location-traffic-accounting'
import { getPaymentProviderId, getPaymentProviderLabel, SUCCESSFUL_PAYMENT_STATUSES } from '@/lib/payments'

export const dynamic = 'force-dynamic'

function startOfToday() {
  return getStartOfAppDay()
}

export async function GET() {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const today = startOfToday()
    const now = new Date()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [topUsersTodayRaw, activeByPlanRaw, recentPayments] = await Promise.all([
      (prisma as any).trafficLog.groupBy({
        by: ['subscriptionId'],
        where: { timestamp: { gte: today, lte: now } },
        _sum: { bytes: true },
        orderBy: { _sum: { bytes: 'desc' } },
        take: 10,
      }),
      prisma.subscription.groupBy({
        by: ['planId'],
        where: { status: 'active', expiresAt: { gt: new Date() } },
        _count: { planId: true },
        orderBy: { _count: { planId: 'desc' } },
      }) as any,
      prisma.payment.findMany({
        where: { status: { in: SUCCESSFUL_PAYMENT_STATUSES as any }, createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          userId: true,
          planId: true,
        months: true,
        amount: true,
        status: true,
        externalId: true,
        createdAt: true,
        user: { select: { username: true, firstName: true, lastName: true, telegramId: true } } as any,
      } as any,
      }) as any,
    ])

    const subscriptionIds = topUsersTodayRaw.map((r: any) => r.subscriptionId).filter(Boolean)
    const subs = subscriptionIds.length
      ? await prisma.subscription.findMany({
          where: { id: { in: subscriptionIds } },
          select: {
            id: true,
            user: { select: { username: true, firstName: true, lastName: true, telegramId: true } } as any,
          } as any,
        })
      : []
    const subById = new Map(subs.map((s: any) => [s.id, s]))

    const topUsersToday = topUsersTodayRaw
      .map((r: any) => {
        const sub = subById.get(r.subscriptionId)
        const u = sub?.user
        const displayName =
          [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() ||
          (u?.username ? `@${u.username}` : '') ||
          (u?.telegramId ? String(u.telegramId) : 'user')
        return {
          subscriptionId: r.subscriptionId,
          telegramId: u?.telegramId ? String(u.telegramId) : null,
          username: u?.username || null,
          displayName,
          bytes: Number(r._sum?.bytes || 0),
        }
      })
      .filter((x: any) => x.bytes > 0)

    const activeByPlan = (activeByPlanRaw || []).map((r: any) => ({
      planId: r.planId,
      count: Number(r._count?.planId || 0),
    }))

    // Add a small node “tops” from diagnostics cache (cheap, no DB)
    const diagnostics = readLocationDiagnosticsCache()
    const locationTraffic = readLocationTrafficAccounting()
    const byLoc = diagnostics.locations || {}
    const trafficByLoc = locationTraffic?.locations || {}
    const nodeTopToday = Object.entries(byLoc)
      .map(([id, snap]: any) => ({
        id,
        bytes: trafficByLoc[id]
          ? Number(trafficByLoc[id].todayBytes || 0)
          : Number(snap?.vpnTraffic?.todayBytes || 0),
        iperf: Number(snap?.iperf?.senderMbps || 0),
        ping: Number(snap?.pingTarget?.avgMs ?? snap?.mtr?.avgMs ?? 0),
        checkedAt: snap?.checkedAt || null,
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 6)

    return NextResponse.json({
      topUsersToday,
      activeByPlan,
      recentPayments: (recentPayments || []).map((p: any) => ({
        id: p.id,
        amount: Number(p.amount || 0),
        planId: p.planId,
        months: p.months,
        providerId: getPaymentProviderId(p.externalId),
        providerLabel: getPaymentProviderLabel(getPaymentProviderId(p.externalId)),
        createdAt: p.createdAt,
        user: {
          telegramId: p.user?.telegramId ? String(p.user.telegramId) : null,
          username: p.user?.username || null,
          displayName:
            [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() ||
            (p.user?.username ? `@${p.user.username}` : '') ||
            (p.user?.telegramId ? String(p.user.telegramId) : 'user'),
        },
      })),
      nodeTopToday,
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
