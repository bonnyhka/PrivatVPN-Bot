import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    // Fetch raw data
    const [payments, users] = await Promise.all([
      prisma.payment.findMany({
        where: {
          status: 'paid',
          createdAt: { gte: sevenDaysAgo }
        },
        select: { amount: true, createdAt: true }
      }),
      prisma.user.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo }
        },
        select: { createdAt: true }
      })
    ])

    // Grouping by Date (YYYY-MM-DD)
    const revenueMap = new Map<string, number>()
    const usersMap = new Map<string, number>()

    // Initialize map for the past 7 days to ensure all days are represented
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo)
      date.setDate(sevenDaysAgo.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      revenueMap.set(dateStr, 0)
      usersMap.set(dateStr, 0)
    }

    payments.forEach((p: { amount: number; createdAt: Date }) => {
      const dateStr = p.createdAt.toISOString().split('T')[0]
      if (revenueMap.has(dateStr)) {
        revenueMap.set(dateStr, revenueMap.get(dateStr)! + p.amount)
      }
    })

    users.forEach((u: { createdAt: Date }) => {
      const dateStr = u.createdAt.toISOString().split('T')[0]
      if (usersMap.has(dateStr)) {
        usersMap.set(dateStr, usersMap.get(dateStr)! + 1)
      }
    })

    // Format for Recharts
    const formatLabel = (dateStr: string) => {
      const [, month, day] = dateStr.split('-')
      return `${day}.${month}`
    }

    const revenueChart = Array.from(revenueMap.entries()).map(([date, amount]) => ({
      date: formatLabel(date),
      amount
    }))

    const usersChart = Array.from(usersMap.entries()).map(([date, count]) => ({
      date: formatLabel(date),
      count
    }))

    return NextResponse.json({
      revenue: revenueChart,
      users: usersChart
    })
  } catch (error) {
    console.error('Admin charts error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
