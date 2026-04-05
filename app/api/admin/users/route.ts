import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const users = await prisma.user.findMany({
      include: { subscription: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users.map(u => ({
      id: u.id,
      telegramId: u.telegramId,
      username: u.username,
      displayName: u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.username || 'User',
      avatar: u.avatar,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      subscription: u.subscription ? {
        id: u.subscription.id,
        planId: u.subscription.planId,
        status: u.subscription.expiresAt < new Date() ? 'expired' : u.subscription.status,
        expiresAt: u.subscription.expiresAt.toISOString(),
        trafficUsed: u.subscription.trafficUsed.toString(),
      } : null,
    })))
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const { userId, role } = await req.json()
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
    })
    return NextResponse.json({ success: true, role: updated.role })
  } catch (error) {
    console.error('Update user role error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
