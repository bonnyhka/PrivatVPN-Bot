import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getClientIp } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 15, 60 * 1000, '/api/user/gift/redeem-code')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
      )
    }

    const session = await getSession()
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { code } = await req.json()
    if (!code) return NextResponse.json({ error: 'Код не указан' }, { status: 400 })

    const gift = await prisma.gift.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (!gift) {
      return NextResponse.json({ error: 'Код не найден' }, { status: 404 })
    }

    if (gift.isUsed) {
      return NextResponse.json({ error: 'Этим кодом уже воспользовались' }, { status: 400 })
    }

    // Link the gift to this user if it wasn't already or is generic
    await prisma.gift.update({
      where: { id: gift.id },
      data: { toId: session.userId }
    })

    // Return the gift so the FE can show the animation
    return NextResponse.json({ success: true, gift })

  } catch (error) {
    console.error('Redeem code error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
