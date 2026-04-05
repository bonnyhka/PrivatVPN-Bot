import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })

    if (!user || user.role !== 'admin' && user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get plan from query or default to citadel
    const { searchParams } = new URL(req.url)
    const planId = searchParams.get('planId') || 'citadel'

    // Create a temporary test gift for the admin to see the animation
    const giftCode = `TEST-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    await prisma.gift.create({
      data: {
        code: giftCode,
        planId: planId,
        months: 1,
        toId: user.id,
        isUsed: false
      }
    })

    return NextResponse.json({ success: true, code: giftCode })
  } catch (error) {
    console.error('Test trigger error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
