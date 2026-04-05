import { NextResponse } from 'next/server'
import { getDynamicPlans } from '@/lib/plans'
import { getClientIp } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 200, 60 * 1000, '/api/plans')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
      )
    }
    const mergedPlans = await getDynamicPlans()
    return NextResponse.json(mergedPlans)
  } catch (error) {
    console.error('Failed to fetch plans:', error)
    return NextResponse.json([])
  }
}
