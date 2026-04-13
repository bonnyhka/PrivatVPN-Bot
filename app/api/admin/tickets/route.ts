import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { notifyTicketStatusChange } from '@/lib/ticket-telegram'

// GET /api/admin/tickets - all tickets for admin
export async function GET() {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const tickets = await prisma.ticket.findMany({
      include: {
        user: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(tickets.map(t => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      user: {
        id: t.user.id,
        telegramId: t.user.telegramId,
        displayName: t.user.firstName ? `${t.user.firstName} ${t.user.lastName || ''}`.trim() : t.user.username || 'User',
        username: t.user.username,
        avatar: t.user.avatar,
      },
      messages: t.messages.map(m => ({
        id: m.id,
        body: m.body,
        isAdmin: m.isAdmin,
        isSystem: (m as any).isSystem,
        imageUrl: m.imageUrl,
        createdAt: m.createdAt.toISOString(),
      })),
      messageCount: t.messages.length,
    })))
  } catch (error) {
    console.error('Admin tickets error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH /api/admin/tickets - update ticket status
export async function PATCH(req: Request) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    const adminUser = await requireAdmin()

    const { ticketId, status } = await req.json()
    
    // Get previous state
    const oldTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        status: true,
        subject: true,
        user: {
          select: {
            telegramId: true,
          },
        },
      },
    })
    if (!oldTicket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
    })

    // If status changed, generate a system message
    if (oldTicket.status !== status) {
      if (status === 'in_progress') {
        const adminName = adminUser.firstName ? `${adminUser.firstName} ${adminUser.lastName || ''}`.trim() : adminUser.username || 'Администратор'
        await prisma.ticketMessage.create({
          data: { ticketId, body: `Тикет принял в работу: ${adminName}`, isAdmin: true, isSystem: true } as any
        })
      } else if (status === 'closed' || status === 'resolved') {
        await prisma.ticketMessage.create({
          data: { ticketId, body: `Тикет ${status === 'closed' ? 'закрыт' : 'решён'}`, isAdmin: true, isSystem: true } as any
        })
      }

      await notifyTicketStatusChange({
        telegramId: oldTicket.user.telegramId,
        subject: oldTicket.subject,
        status,
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update ticket error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/admin/tickets - delete a ticket
export async function DELETE(req: Request) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    await prisma.ticket.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete ticket error:', error)
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 })
  }
}
