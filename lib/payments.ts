export const SUCCESSFUL_PAYMENT_STATUSES = ['success', 'paid', 'completed'] as const
export const PENDING_PAYMENT_STATUS = 'pending'
export const EXPIRED_PAYMENT_STATUS = 'expired'
export const PENDING_PAYMENT_TTL_MS = 60 * 60 * 1000

export type PaymentProviderId =
  | 'heleket'
  | 'crystalpay'
  | 'yoomoney'
  | 'manual'
  | 'internal'
  | 'unknown'

const PLAN_PACKAGE_PRICES: Record<string, Record<number, number>> = {
  scout: { 1: 99, 3: 199, 6: 249, 12: 299 },
  guardian: { 1: 149, 3: 299, 6: 399, 12: 499 },
  fortress: { 1: 199, 3: 399, 6: 549, 12: 699 },
  citadel: { 1: 299, 3: 599, 6: 799, 12: 999 },
}

export function isSuccessfulPaymentStatus(status?: string | null) {
  return Boolean(status && (SUCCESSFUL_PAYMENT_STATUSES as readonly string[]).includes(status))
}

export function getSystemDiscountRate(months: number, isGift: boolean) {
  if (isGift) return 0.15
  return 0
}

export function getPlanBasePrice(planId: string, monthlyPrice: number, months: number) {
  const normalizedPlanId = String(planId || '').trim().toLowerCase()
  const packagePrice = PLAN_PACKAGE_PRICES[normalizedPlanId]?.[months]
  if (typeof packagePrice === 'number') {
    return packagePrice
  }

  return Math.max(0, Math.floor(monthlyPrice * months))
}

export function applySystemDiscount(amount: number, _months: number, isGift: boolean) {
  const safeAmount = Math.max(0, Math.floor(amount))
  const discountRate = getSystemDiscountRate(_months, isGift)
  return Math.floor(safeAmount * (1 - discountRate))
}

export function getPaymentExpiresAt(createdAt: Date) {
  return new Date(createdAt.getTime() + PENDING_PAYMENT_TTL_MS)
}

export function getEffectivePaymentStatus(payment: { status: string; createdAt: Date }, now = new Date()) {
  if (payment.status === PENDING_PAYMENT_STATUS && getPaymentExpiresAt(payment.createdAt).getTime() <= now.getTime()) {
    return EXPIRED_PAYMENT_STATUS
  }
  return payment.status
}

export function normalizePaymentStatus(payment: { status: string; createdAt: Date }, now = new Date()) {
  const effectiveStatus = getEffectivePaymentStatus(payment, now)
  if (isSuccessfulPaymentStatus(effectiveStatus)) {
    return 'success'
  }
  return effectiveStatus
}

export function getPaymentProviderId(externalId?: string | null): PaymentProviderId {
  const normalized = String(externalId || '').toLowerCase()

  if (normalized.startsWith('heleket:')) return 'heleket'
  if (normalized.startsWith('crystal:')) return 'crystalpay'
  if (normalized.startsWith('yoomoney:')) return 'yoomoney'
  if (normalized.startsWith('manual:')) return 'manual'
  if (normalized.startsWith('internal:')) return 'internal'

  return 'unknown'
}

export function getPaymentProviderLabel(providerId: PaymentProviderId) {
  switch (providerId) {
    case 'heleket':
      return 'Heleket'
    case 'crystalpay':
      return 'CrystalPay'
    case 'yoomoney':
      return 'YooMoney'
    case 'manual':
      return 'Ручная выдача'
    case 'internal':
      return 'Внутренняя активация'
    default:
      return 'Другое'
  }
}

export function isCryptoPaymentProvider(providerId: PaymentProviderId) {
  return providerId === 'heleket'
}
