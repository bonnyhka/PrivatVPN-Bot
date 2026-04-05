import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireAdmin()
    const { status, trackingNumber } = await req.json()

    const order = await prisma.routerOrder.update({
      where: { id },
      data: {
        status,
        trackingNumber
      }
    })

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('Update order error:', error)
    const status = error?.message === 'Unauthorized' ? 401 : error?.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
