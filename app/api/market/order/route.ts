import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp, marketOrderSchema } from '@/lib/request-security'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 5, 15 * 60 * 1000, '/api/market/order')
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const payload = marketOrderSchema.safeParse(await req.json())
    if (!payload.success) {
      return NextResponse.json({ success: false, error: 'Invalid fields' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })

    if (!user) return new Response('User not found', { status: 404 })

    const product = await prisma.routerProduct.findUnique({
      where: { id: payload.data.productId }
    })

    if (!product) return new Response('Product not found', { status: 404 })

    const order = await prisma.routerOrder.create({
      data: {
        userId: user.id,
        productId: product.id,
        fullName: payload.data.fullName,
        phone: payload.data.phone,
        address: payload.data.address,
        city: payload.data.city,
        amount: product.price,
        status: 'pending'
      }
    })

    return NextResponse.json({ success: true, orderId: order.id })
  } catch (error: any) {
    console.error('Market order error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
