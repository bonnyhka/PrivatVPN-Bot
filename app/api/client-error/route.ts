import { appendFile, mkdir } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getClientIp } from '@/lib/request-security'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const payloadSchema = z.object({
  type: z.string().trim().min(1).max(40),
  message: z.string().trim().min(1).max(4000),
  stack: z.string().trim().max(12000).optional().nullable(),
  source: z.string().trim().max(2000).optional().nullable(),
  lineno: z.coerce.number().int().min(0).max(1000000).optional().nullable(),
  colno: z.coerce.number().int().min(0).max(1000000).optional().nullable(),
  href: z.string().trim().max(4000).optional().nullable(),
  userAgent: z.string().trim().max(2000).optional().nullable(),
  timestamp: z.string().trim().max(100).optional().nullable(),
})

const logDir = path.join(process.cwd(), 'data')
const logFile = path.join(logDir, 'client-errors.log')

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { allowed, retryAfter } = rateLimit(ip, 60, 60 * 1000, '/api/client-error')
    if (!allowed) {
      return NextResponse.json(
        { ok: false },
        { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
      )
    }

    const body = await req.json()
    const payload = payloadSchema.parse(body)
    const record = {
      ip,
      ...payload,
      serverTimestamp: new Date().toISOString(),
    }

    const line = `${JSON.stringify(record)}\n`
    await mkdir(logDir, { recursive: true })
    await appendFile(logFile, line, 'utf8')
    console.error('[client-error]', record)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Client error log route failed:', error)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
