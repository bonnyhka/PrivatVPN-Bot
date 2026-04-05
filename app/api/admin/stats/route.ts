import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [totalUsers, activeKeys, openTickets, monthlyRevenueRes, monthlyTrafficRes, newUsers30d] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: 'active', expiresAt: { gt: new Date() } } }),
      prisma.ticket.count({ where: { status: 'open' } }),
      prisma.payment.aggregate({
        where: { status: { in: ['paid', 'completed'] }, createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true }
      }),
      (prisma as any).trafficLog.aggregate({
        where: { timestamp: { gte: thirtyDaysAgo } },
        _sum: { bytes: true }
      }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } })
    ])

    return NextResponse.json({
      totalUsers,
      activeKeys,
      openTickets,
      monthlyRevenue: monthlyRevenueRes._sum?.amount || 0,
      monthlyTraffic: Number(monthlyTrafficRes._sum?.bytes || 0),
      lastSync: new Date().toISOString(),
      newUsers30d
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
