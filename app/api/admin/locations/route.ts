import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { execSync } from 'child_process'
import crypto from 'crypto'
import { nextLocationName, resolveFlagIso } from '@/lib/location-naming'

export async function GET(req: Request) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' }
    })
    
    return NextResponse.json(locations)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const body = await req.json()
    const { country, flag, host, sshPass, isActive } = body

    if (!host) {
      return NextResponse.json({ error: 'Host is required' }, { status: 400 })
    }

    const normalizedCountry = String(country || '').trim() || 'Unknown'
    const finalName = await nextLocationName(prisma, normalizedCountry)
    const finalFlag = resolveFlagIso(normalizedCountry, flag)

    // Auto-generate UUID and Reality keys
    const vlessUuid = crypto.randomUUID()
    const vlessRealityShortId = crypto.randomBytes(8).toString('hex')
    
    let publicKey = ''
    let privateKey = ''
    try {
      const output = execSync('sing-box generate reality-keypair', { encoding: 'utf-8' })
      const lines = output.split('\n')
      for (const line of lines) {
        if (line.startsWith('PrivateKey:')) privateKey = line.split('PrivateKey:')[1].trim()
        if (line.startsWith('PublicKey:')) publicKey = line.split('PublicKey:')[1].trim()
      }
    } catch(e) {
      console.error('Failed to generate reality keys via sing-box:', e)
    }

    const loc = await prisma.location.create({
      data: {
        name: finalName,
        country: normalizedCountry,
        flag: finalFlag,
        host,
        sshUser: 'root',
        sshPass: sshPass || '',
        isActive: isActive !== false,
        ping: 0,
        load: 0,
        liveConnections: 0,
        // Generated settings
        vlessUuid,
        vlessRealityPublicKey: publicKey,
        vlessRealityPrivateKey: privateKey,
        vlessRealityShortId,
        vlessRealitySni: 'www.microsoft.com',
        vlessPort: 443,
        vlessNetwork: 'tcp',
        vlessTls: true,
        vlessReality: true,
      }
    })

    return NextResponse.json(loc)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
