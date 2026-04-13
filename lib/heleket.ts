import crypto from 'crypto'

const HELEKET_API_BASE = 'https://api.heleket.com'

export type HeleketPaymentStatus =
  | 'paid'
  | 'paid_over'
  | 'wrong_amount'
  | 'process'
  | 'confirm_check'
  | 'wrong_amount_waiting'
  | 'check'
  | 'fail'
  | 'cancel'
  | 'system_fail'
  | 'refund_process'
  | 'refund_fail'
  | 'refund_paid'
  | 'locked'
  | string

export interface HeleketInvoice {
  uuid: string
  order_id?: string
  amount?: string
  payment_amount?: string | null
  payment_amount_usd?: string | null
  payer_amount?: string | null
  payer_currency?: string | null
  currency?: string | null
  merchant_amount?: string | null
  network?: string | null
  address?: string | null
  txid?: string | null
  payment_status?: HeleketPaymentStatus | null
  status?: HeleketPaymentStatus | null
  url?: string | null
  expired_at?: number | null
  is_final?: boolean
  additional_data?: string | null
  created_at?: string | null
  updated_at?: string | null
  commission?: string | null
}

type HeleketApiResponse<T> =
  | {
      state: 0
      result: T
    }
  | {
      state: 1
      message?: string
      errors?: Record<string, string[]>
    }

type CreateHeleketInvoiceOptions = {
  amount: number
  orderId: string
  successUrl?: string | null
  returnUrl?: string | null
  callbackUrl?: string | null
  additionalData?: string | null
  lifetimeSeconds?: number
}

function getHeleketMerchant() {
  return process.env.HELEKET_MERCHANT_ID || process.env.HELEKET_MERCHANT_UUID || ''
}

function getHeleketApiKey() {
  return process.env.HELEKET_API_KEY || process.env.HELEKET_PAYMENT_KEY || ''
}

function assertHeleketCredentials() {
  const merchant = getHeleketMerchant()
  const apiKey = getHeleketApiKey()

  if (!merchant || !apiKey) {
    throw new Error('Heleket credentials are not configured')
  }

  return { merchant, apiKey }
}

function encodeHeleketBody(rawBody: string) {
  return Buffer.from(rawBody).toString('base64')
}

function signHeleketRawBody(rawBody: string) {
  const { apiKey } = assertHeleketCredentials()
  return crypto.createHash('md5').update(`${encodeHeleketBody(rawBody)}${apiKey}`).digest('hex')
}

function normalizeAmount(amount: number) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
}

async function heleketRequest<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const { merchant } = assertHeleketCredentials()
  const rawBody = JSON.stringify(payload)

  const res = await fetch(`${HELEKET_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      merchant,
      sign: signHeleketRawBody(rawBody),
      'Content-Type': 'application/json',
    },
    body: rawBody,
    cache: 'no-store',
  })

  const rawText = await res.text()
  let data: HeleketApiResponse<T>

  try {
    data = JSON.parse(rawText)
  } catch {
    throw new Error(`Heleket returned invalid JSON (${res.status})`)
  }

  if (!res.ok) {
    const message = 'message' in data && data.message ? data.message : `Heleket request failed (${res.status})`
    throw new Error(message)
  }

  if (data.state !== 0 || !('result' in data)) {
    const message =
      ('message' in data && data.message) ||
      ('errors' in data && data.errors && Object.values(data.errors).flat().join(', ')) ||
      'Heleket returned an error'
    throw new Error(message)
  }

  return data.result
}

export async function createHeleketInvoice(options: CreateHeleketInvoiceOptions) {
  const result = await heleketRequest<HeleketInvoice>('/v1/payment', {
    amount: normalizeAmount(options.amount),
    currency: 'RUB',
    order_id: options.orderId,
    url_success: options.successUrl || undefined,
    url_return: options.returnUrl || options.successUrl || undefined,
    url_callback: options.callbackUrl || undefined,
    additional_data: options.additionalData || undefined,
    is_payment_multiple: true,
    lifetime: Math.max(300, Math.floor(options.lifetimeSeconds || 3600)),
  })

  return {
    id: result.uuid,
    url: result.url || '',
    amount: result.amount || normalizeAmount(options.amount),
  }
}

export async function getHeleketInvoice(uuid: string) {
  return heleketRequest<HeleketInvoice>('/v1/payment/info', { uuid })
}

export function extractHeleketInvoiceId(externalId?: string | null) {
  if (!externalId) return null
  if (!externalId.startsWith('heleket:')) return null
  return externalId.slice('heleket:'.length)
}

export function getHeleketWebhookSignature(payload: Record<string, unknown>) {
  const nextPayload = { ...payload }
  delete (nextPayload as { sign?: string }).sign
  return signHeleketRawBody(JSON.stringify(nextPayload))
}

export function isHeleketSignatureValid(payload: Record<string, unknown>, signature?: string | null) {
  if (!signature) return false

  const expected = getHeleketWebhookSignature(payload)
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(String(signature))

  if (expectedBuffer.length !== actualBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}

export function getHeleketPaymentStatus(invoice?: Pick<HeleketInvoice, 'status' | 'payment_status'> | null) {
  return String(invoice?.status || invoice?.payment_status || '').toLowerCase()
}

export function isHeleketPaidStatus(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  return normalized === 'paid' || normalized === 'paid_over'
}

export function isHeleketPendingStatus(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  return ['check', 'process', 'confirm_check', 'wrong_amount', 'wrong_amount_waiting'].includes(normalized)
}

export function isHeleketFailureStatus(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  return ['fail', 'cancel', 'system_fail', 'refund_process', 'refund_fail', 'refund_paid', 'locked'].includes(normalized)
}
