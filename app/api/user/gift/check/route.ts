import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Check for an unused gift assigned to this user's ID
    let gift = await prisma.gift.findFirst({
      where: { toId: user.id, isUsed: false }
    })

    // If not found, check by username (ignoring case manually for safety if needed, 
    // but SQLite is usually case-insensitive for ASCII)
    if (!gift && user.username) {
      gift = await prisma.gift.findFirst({
        where: { toUsername: user.username, isUsed: false }
      })
    }

    if (!gift) return NextResponse.json({ gift: null })

    return NextResponse.json({ gift })
  } catch (error) {
    console.error('Check gift error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
