import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const body = await req.json()
    const { id, price, features, trafficLimit } = body

    if (!id || typeof price !== 'number' || !Array.isArray(features)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const tLimit = trafficLimit === Number.MAX_SAFE_INTEGER ? null : BigInt(trafficLimit)

    const updated = await prisma.planConfig.upsert({
      where: { id },
      update: {
        price,
        features: JSON.stringify(features),
        trafficLimit: tLimit
      },
      create: {
        id,
        price,
        features: JSON.stringify(features),
        trafficLimit: tLimit
      }
    })

    return NextResponse.json({ success: true, updated: { ...updated, trafficLimit: updated.trafficLimit?.toString() } })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('Failed to update plan pricing:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
