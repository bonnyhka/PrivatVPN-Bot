import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp, ticketReplySchema } from '@/lib/request-security'
import { notifyTicketReply } from '@/lib/ticket-telegram'

// POST /api/tickets/[id]/reply - add a message to a ticket
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 20, 10 * 60 * 1000, '/api/tickets/reply')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const params = await props.params
    const payload = ticketReplySchema.safeParse(await req.json())
    if (!payload.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    if (!payload.data.body && !payload.data.imageUrl) {
      return NextResponse.json({ error: 'Missing body' }, { status: 400 })
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true },
    })
    if (!actor) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        status: true,
        subject: true,
        user: {
          select: {
            telegramId: true,
          },
        },
      },
    })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const isAdmin = actor.role === 'admin' || actor.role === 'owner'
    if (!isAdmin && ticket.userId !== actor.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const msg = await prisma.ticketMessage.create({
      data: {
        body: payload.data.body || '',
        imageUrl: payload.data.imageUrl || null,
        isAdmin,
        ticketId: params.id,
      },
    })

    // Bump the ticket's updatedAt
    await prisma.ticket.update({
      where: { id: params.id },
      data: { 
        updatedAt: new Date(),
        // If admin replies, mark as in_progress; if user replies to a resolved, re-open
        ...(isAdmin
          ? { status: 'in_progress' }
          : ticket.status === 'resolved' || ticket.status === 'closed'
            ? { status: 'open' }
            : {}),
      },
    })

    if (isAdmin) {
      await notifyTicketReply({
        telegramId: ticket.user.telegramId,
        subject: ticket.subject,
      })
    }

    return NextResponse.json(msg)
  } catch (error) {
    console.error('Reply ticket error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
