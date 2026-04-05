import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { formatUserForClient } from '@/lib/format-user'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        subscription: true,
        referralActions: {
          include: { referred: { select: { username: true, avatar: true, firstName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: { select: { referrals: true } }
      }
    }) as any

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const firstLocation = await prisma.location.findFirst({ where: { isActive: true } })
    if (firstLocation) {
      const { getMtprotoProxyUrl } = await import('@/lib/security')
      user.tgProxyUrl = getMtprotoProxyUrl(firstLocation.host, firstLocation.name)
    }

    return NextResponse.json({ user: formatUserForClient(user) })
  } catch (error) {
    console.error('User me error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
