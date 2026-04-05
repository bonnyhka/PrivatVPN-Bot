import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()

    const orders = await prisma.routerOrder.findMany({
      include: {
        product: true,
        user: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(orders)
  } catch (error: any) {
    console.error('Admin orders error:', error)
    const status = error?.message === 'Unauthorized' ? 401 : error?.message === 'Forbidden' ? 403 : 500
    return new Response(status === 500 ? 'Internal Server Error' : error.message, { status })
  }
}
