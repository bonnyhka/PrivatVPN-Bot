import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { nextLocationName, resolveFlagIso } from '@/lib/location-naming'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const { id } = await params
    const body = await req.json()
    const { country, flag, host, sshPass, isActive } = body

    const existing = await prisma.location.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const nextCountry =
      country !== undefined ? String(country).trim() || 'Unknown' : existing.country
    const countryChanged =
      country !== undefined && nextCountry !== String(existing.country).trim()

    const nextFlag =
      flag !== undefined
        ? resolveFlagIso(nextCountry, flag)
        : resolveFlagIso(nextCountry, existing.flag)

    let nextName = existing.name
    if (countryChanged) {
      nextName = await nextLocationName(prisma, nextCountry, id)
    }

    const loc = await prisma.location.update({
      where: { id },
      data: {
        name: nextName,
        country: nextCountry,
        flag: nextFlag,
        ...(host !== undefined && { host }),
        ...(sshPass !== undefined && { sshPass }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(loc)
  } catch (err: any) {
    console.error('PUT Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const { id } = await params
    await prisma.location.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
