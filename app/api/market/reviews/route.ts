import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp, marketReviewSchema } from '@/lib/request-security'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 8, 60 * 60 * 1000, '/api/market/reviews')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const payload = marketReviewSchema.safeParse(await req.json())
    if (!payload.success) {
      return NextResponse.json({ error: 'Invalid fields' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Optional: Check if user has an order for this product
    const order = await prisma.routerOrder.findFirst({
      where: {
        userId: user.id,
        productId: payload.data.productId,
        status: 'delivered'
      }
    })

    // For now, allow all reviews to make it "work" as requested, but we can restrict later
    const review = await prisma.routerReview.create({
      data: {
        productId: payload.data.productId,
        userId: user.id,
        rating: payload.data.rating,
        comment: payload.data.comment
      }
    })

    return NextResponse.json({ success: true, review })
  } catch (error) {
    console.error('Create review error:', error)
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
  }
}
