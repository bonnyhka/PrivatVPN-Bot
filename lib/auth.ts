
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import prisma from './db'

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('[auth] JWT_SECRET environment variable is not set!')
  return secret
})()

export async function createSession(userId: string) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return decoded
  } catch {
    return null
  }
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    throw new Error('Forbidden')
  }

  return user
}
