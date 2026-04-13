import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getClientIp } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 120, 60 * 1000, '/api/market/product')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
      )
    }
    let product = await prisma.routerProduct.findFirst({
      where: { isActive: true },
      include: {
        reviews: {
          include: {
            userIdRel: {
              select: { firstName: true, username: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    if (!product) {
      // Create a default generic product if none exists
      product = await prisma.routerProduct.create({
        data: {
          name: 'PrivatVPN Home Router (Pro Edition)',
          description: 'Универсальное решение для безопасного интернета во всём доме. Настроен нашими инженерами на максимальную скорость и стабильность. Работает "из коробки" — просто включите в розетку.',
          price: 6990,
          stock: 10,
          specs: JSON.stringify([
            { label: 'Стандарт', value: 'Wi-Fi 6 (802.11ax)' },
            { label: 'Порты', value: '1 Гбит/с WAN/LAN' },
            { label: 'VPN Протоколы', value: 'VLESS Reality, Hysteria 2' },
            { label: 'Покрытие', value: 'до 100 м²' }
          ]),
          imageUrl: '/images/router-hero.png'
        },
        include: { reviews: true }
      }) as any
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Fetch product error:', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}
