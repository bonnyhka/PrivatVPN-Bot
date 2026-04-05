import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { applyCompensation, broadcastDiscount, mapDiscount } from '@/lib/discounts'
import { createPromoCode } from '@/lib/security'

function parseBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return fallback
}

function parseDateStart(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00.000Z`)
  }
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseDateEnd(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T23:59:59.999Z`)
  }
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET() {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const discounts = await prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ discounts: discounts.map((discount) => mapDiscount(discount as any)) })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Failed to fetch discounts' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const body = await req.json()
    const {
      action,
      id,
      code,
      mode,
      delivery,
      audience,
      type,
      value,
      minPurchase,
      usageLimit,
      maxUses,
      compensationDays,
      validFrom,
      validTo,
      applicablePlans,
      isActive,
      description,
      targetUsers,
      broadcastText,
    } = body

    if (action === 'broadcast') {
      if (!id) {
        return NextResponse.json({ error: 'Missing discount ID' }, { status: 400 })
      }
      const result = await broadcastDiscount(id)
      return NextResponse.json({ success: true, ...result })
    }

    if (action === 'apply_compensation') {
      if (!id) {
        return NextResponse.json({ error: 'Missing discount ID' }, { status: 400 })
      }
      const result = await applyCompensation(id)
      return NextResponse.json({ success: true, ...result })
    }

    const normalizedMode = ['promo', 'global', 'compensation'].includes(String(mode))
      ? String(mode)
      : 'promo'
    const normalizedDelivery = normalizedMode === 'promo'
      ? (['code', 'broadcast'].includes(String(delivery)) ? String(delivery) : 'code')
      : 'auto'
    const normalizedAudience = ['all', 'active', 'expired', 'paid', 'custom'].includes(String(audience))
      ? String(audience)
      : 'all'
    const normalizedType = String(type) === 'fixed' ? 'fixed' : 'percent'
    const normalizedCode = String(
      code || createPromoCode(normalizedMode === 'compensation' ? 'COMP' : normalizedMode === 'global' ? 'GLOBAL' : 'PROMO')
    ).trim().toUpperCase()
    const parsedValidFrom = parseDateStart(validFrom)
    const parsedValidTo = parseDateEnd(validTo)
    const parsedValue = Number(value)
    const parsedCompensationDays = compensationDays === '' || compensationDays == null ? null : Number(compensationDays)
    const parsedMinPurchase = minPurchase === '' || minPurchase == null ? null : Number(minPurchase)
    const parsedUsageLimit = usageLimit === '' || usageLimit == null
      ? (maxUses === '' || maxUses == null ? null : Number(maxUses))
      : Number(usageLimit)

    if (normalizedMode === 'promo' && !normalizedCode) {
      return NextResponse.json({ error: 'Укажите код акции или оставьте поле пустым для автогенерации' }, { status: 400 })
    }
    if (!parsedValidFrom || !parsedValidTo) {
      return NextResponse.json({ error: 'Укажите корректный период действия акции' }, { status: 400 })
    }
    if (normalizedMode !== 'compensation' && (Number.isNaN(parsedValue) || parsedValue <= 0)) {
      return NextResponse.json({ error: 'Укажите корректный размер скидки' }, { status: 400 })
    }
    if (normalizedMode === 'compensation' && (parsedCompensationDays == null || Number.isNaN(parsedCompensationDays) || parsedCompensationDays <= 0)) {
      return NextResponse.json({ error: 'Укажите количество дней компенсации' }, { status: 400 })
    }
    if (parsedMinPurchase != null && Number.isNaN(parsedMinPurchase)) {
      return NextResponse.json({ error: 'Некорректная минимальная сумма покупки' }, { status: 400 })
    }
    if (parsedUsageLimit != null && (Number.isNaN(parsedUsageLimit) || parsedUsageLimit <= 0)) {
      return NextResponse.json({ error: 'Некорректный лимит использований' }, { status: 400 })
    }

    const data = {
      code: normalizedMode === 'promo' ? normalizedCode : normalizedCode || createPromoCode(normalizedMode.toUpperCase()),
      mode: normalizedMode,
      delivery: normalizedDelivery,
      audience: normalizedAudience,
      type: normalizedMode === 'compensation' ? 'fixed' : normalizedType,
      value: normalizedMode === 'compensation' ? 0 : parsedValue,
      compensationDays: normalizedMode === 'compensation' ? parsedCompensationDays : null,
      minPurchase: normalizedMode === 'compensation' ? null : parsedMinPurchase,
      usageLimit: normalizedMode === 'compensation' ? null : parsedUsageLimit,
      validFrom: parsedValidFrom,
      validTo: parsedValidTo,
      applicablePlans: Array.isArray(applicablePlans)
        ? (applicablePlans.length ? applicablePlans.join(',') : 'all')
        : (applicablePlans || 'all'),
      isActive: parseBoolean(isActive, true),
      description: description || null,
      targetUsers: normalizedAudience === 'custom' ? (targetUsers || null) : null,
      broadcastText: normalizedMode === 'promo' && normalizedDelivery === 'broadcast' ? (broadcastText || null) : null,
    }

    if (id) {
      const discount = await prisma.discountCode.update({ where: { id }, data })
      return NextResponse.json({ discount: mapDiscount(discount as any) })
    } else {
      const discount = await prisma.discountCode.create({ data })
      return NextResponse.json({ discount: mapDiscount(discount as any) })
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('Discount Save Error:', error)
    return NextResponse.json({ error: 'Failed to save discount' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    await prisma.discountCode.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Failed to delete discount' }, { status: 500 })
  }
}
