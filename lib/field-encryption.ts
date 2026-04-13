import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

/** Stored format: enc:v1:<base64url(iv12 + tag16 + ciphertext)> */
const PREFIX = 'enc:v1:'
const ALG = 'aes-256-gcm'

const SECRET_LOCATION_FIELDS = ['sshPass', 'vlessRealityPrivateKey', 'ssPassword'] as const

function getKey(): Buffer {
  const raw = process.env.SECRETS_ENCRYPTION_KEY?.trim()
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECRETS_ENCRYPTION_KEY must be set in production')
    }
    console.warn(
      '[secrets] SECRETS_ENCRYPTION_KEY is not set; using a dev-only derived key (data is not portable across machines)'
    )
    return scryptSync('privatvpn-dev-insecure', 'field-encryption-v1', 32)
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }
  const b64 = Buffer.from(raw, 'base64')
  if (b64.length === 32) return b64
  throw new Error(
    'SECRETS_ENCRYPTION_KEY must be 32 bytes: 64 hex chars or base64 encoding 32 raw bytes'
  )
}

export function isEncryptedField(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

export function encryptField(plain: string | null | undefined): string | null | undefined {
  if (plain == null || plain === '') return plain
  if (typeof plain === 'string' && plain.startsWith(PREFIX)) return plain
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALG, key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload = Buffer.concat([iv, tag, enc]).toString('base64url')
  return PREFIX + payload
}

export function decryptField(encrypted: string | null | undefined): string | null | undefined {
  if (encrypted == null || encrypted === '') return encrypted
  if (!encrypted.startsWith(PREFIX)) return encrypted
  const key = getKey()
  const buf = Buffer.from(encrypted.slice(PREFIX.length), 'base64url')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ct = buf.subarray(28)
  const decipher = createDecipheriv(ALG, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(ct, undefined, 'utf8') + decipher.final('utf8')
}

function mapLocationDecrypt(row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row }
  for (const key of SECRET_LOCATION_FIELDS) {
    if (key in out && typeof out[key] === 'string') {
      out[key] = decryptField(out[key] as string)
    }
  }
  return out
}

function isLocationRow(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return SECRET_LOCATION_FIELDS.some((field) => typeof o[field] === 'string')
}

const WRITE_ENCRYPT_OPS = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert'])

const READ_DECRYPT_OPS = new Set([
  'findUnique',
  'findFirst',
  'findMany',
  'create',
  'update',
  'upsert',
  'delete',
])

export function encryptLocationArgs(operation: string, args: Record<string, unknown>): Record<string, unknown> {
  if (!WRITE_ENCRYPT_OPS.has(operation) || !args) return args

  if (operation === 'create') {
    return { ...args, data: mapLocationEncryptPartial(args.data as Record<string, unknown>) }
  }
  if (operation === 'createMany') {
    const data = args.data
    if (Array.isArray(data)) {
      return { ...args, data: data.map((d) => mapLocationEncryptPartial(d as Record<string, unknown>)) }
    }
    return { ...args, data: mapLocationEncryptPartial(data as Record<string, unknown>) }
  }
  if (operation === 'update' || operation === 'updateMany') {
    return { ...args, data: mapLocationEncryptPartial(args.data as Record<string, unknown>) }
  }
  if (operation === 'upsert') {
    return {
      ...args,
      create: mapLocationEncryptPartial(args.create as Record<string, unknown>),
      update: mapLocationEncryptPartial(args.update as Record<string, unknown>),
    }
  }
  return args
}

function mapLocationEncryptPartial(
  data: Record<string, unknown> | undefined | null
): Record<string, unknown> | undefined | null {
  if (!data || typeof data !== 'object') return data
  const out = { ...data }
  for (const key of SECRET_LOCATION_FIELDS) {
    if (key in out && out[key] != null && out[key] !== '') {
      const v = out[key]
      if (typeof v === 'string') {
        out[key] = encryptField(v)
      }
    }
  }
  return out
}

export function decryptLocationResult(operation: string, data: unknown): unknown {
  if (!READ_DECRYPT_OPS.has(operation)) return data
  if (data == null) return data
  if (Array.isArray(data)) {
    return data.map((item) => (isLocationRow(item) ? mapLocationDecrypt(item) : item))
  }
  if (isLocationRow(data)) {
    return mapLocationDecrypt(data)
  }
  return data
}
