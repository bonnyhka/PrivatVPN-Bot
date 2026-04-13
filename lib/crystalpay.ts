import crypto from 'crypto'

const CRYSTALPAY_API_BASE = 'https://api.crystalpay.io/v3'

export type CrystalPayInvoiceState =
  | 'created'
  | 'notpayed'
  | 'processing'
  | 'wrongamount'
  | 'failed'
  | 'payed'
  | string

export interface CrystalPayInvoice {
  id: string
  url: string
  state?: CrystalPayInvoiceState
  rub_amount?: string
  currency?: string
  amount?: string
  amount_currency?: string
  type?: string
  description?: string | null
  redirect_url?: string | null
  callback_url?: string | null
  extra?: string | null
  created_at?: string
  expired_at?: string | null
  final_at?: string | null
}

type CrystalPayApiResponse<T> = {
  error: boolean
  errors?: string[]
} & T

type CreateCrystalPayInvoiceOptions = {
  amount: number
  description: string
  redirectUrl?: string | null
  callbackUrl?: string | null
  extra?: string | null
  lifetimeMinutes?: number
}

function getCrystalPayLogin() {
  return process.env.CRYSTALPAY_LOGIN || process.env.CRYSTALPAY_MERCHANT || ''
}

function getCrystalPaySecret() {
  return process.env.CRYSTALPAY_SECRET || ''
}

function getCrystalPaySalt() {
  return process.env.CRYSTALPAY_SALT || ''
}

function assertCrystalPayCredentials() {
  const login = getCrystalPayLogin()
  const secret = getCrystalPaySecret()
  if (!login || !secret) {
    throw new Error('CrystalPay credentials are not configured')
  }

  return { login, secret }
}

function normalizeAmount(amount: number) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
}

async function crystalPayRequest<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const { login, secret } = assertCrystalPayCredentials()

  const res = await fetch(`${CRYSTALPAY_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_login: login,
      auth_secret: secret,
      ...payload,
    }),
    cache: 'no-store',
  })

  const rawText = await res.text()
  let data: CrystalPayApiResponse<T>

  try {
    data = JSON.parse(rawText)
  } catch {
    throw new Error(`CrystalPay returned invalid JSON (${res.status})`)
  }

  if (!res.ok) {
    throw new Error((data.errors && data.errors[0]) || `CrystalPay request failed (${res.status})`)
  }

  if (data.error) {
    throw new Error((data.errors && data.errors.join(', ')) || 'CrystalPay returned an error')
  }

  return data
}

export async function createCrystalPayInvoice(options: CreateCrystalPayInvoiceOptions) {
  const data = await crystalPayRequest<CrystalPayInvoice>('/invoice/create/', {
    amount: normalizeAmount(options.amount),
    currency: 'RUB',
    type: 'purchase',
    lifetime: Math.max(1, Math.floor(options.lifetimeMinutes || 60)),
    description: options.description,
    redirect_url: options.redirectUrl || undefined,
    callback_url: options.callbackUrl || undefined,
    extra: options.extra || undefined,
  })

  return {
    id: data.id,
    url: data.url,
    rubAmount: data.rub_amount || String(options.amount),
  }
}

export async function getCrystalPayInvoice(id: string) {
  return crystalPayRequest<CrystalPayInvoice>('/invoice/info/', { id })
}

export function extractCrystalPayInvoiceId(externalId?: string | null) {
  if (!externalId) return null
  if (!externalId.startsWith('crystal:')) return null
  return externalId.slice('crystal:'.length)
}

export function getCrystalPayCallbackSignature(id: string) {
  const salt = getCrystalPaySalt()
  if (!salt) {
    throw new Error('CrystalPay salt is not configured')
  }

  return crypto.createHash('sha1').update(`${id}:${salt}`).digest('hex')
}

export function isCrystalPaySignatureValid(id: string, signature?: string | null) {
  if (!signature) return false

  const expected = getCrystalPayCallbackSignature(id)
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(String(signature))

  if (expectedBuffer.length !== actualBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}

export function isCrystalPayPaidState(state?: string | null) {
  return String(state || '').toLowerCase() === 'payed'
}

export function isCrystalPayFailureState(state?: string | null) {
  return String(state || '').toLowerCase() === 'failed'
}

export function isCrystalPayPendingState(state?: string | null) {
  const normalized = String(state || '').toLowerCase()
  return ['created', 'notpayed', 'processing', 'wrongamount'].includes(normalized)
}
