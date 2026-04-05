import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp, ticketCreateSchema } from '@/lib/request-security'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tickets = await prisma.ticket.findMany({
      where: { userId: session.userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(tickets)
  } catch (error) {
    console.error('GET tickets error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/tickets - create a new ticket
export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 6, 10 * 60 * 1000, '/api/tickets')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const payload = ticketCreateSchema.safeParse(await req.json())
    if (!payload.success) {
      return NextResponse.json({ error: 'Invalid fields' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const ticket = await prisma.ticket.create({
      data: {
        subject: payload.data.subject,
        userId: user.id,
        messages: {
          create: [
            { body: payload.data.message, isAdmin: false, imageUrl: payload.data.imageUrl || null },
            { body: 'Тикет открыт, наша команда ответит вам в ближайшее время.', isAdmin: true, isSystem: true } as any
          ]
        },
      },
      include: { messages: true },
    })

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('POST ticket error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
