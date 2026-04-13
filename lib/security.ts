import crypto from 'crypto'

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz'
const DIGITS = '23456789'
const SYMBOLS = '!@#%^*_-+='
const PASSWORD_ALPHABET = `${UPPERCASE}${LOWERCASE}${DIGITS}${SYMBOLS}`

export const DUMMY_UUID = '00000000-0000-4000-8000-000000000000'
export const DUMMY_PASSWORD = 'Disabled_2026_Fallback!'

function randomInt(max: number) {
  return crypto.randomInt(0, max)
}

function sample(chars: string) {
  return chars[randomInt(chars.length)]
}

function shuffle(input: string[]) {
  const result = [...input]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    const current = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = current
  }
  return result
}

export function createStrongPassword(length = 24) {
  const targetLength = Math.max(length, 12)
  const chars = [
    sample(UPPERCASE),
    sample(LOWERCASE),
    sample(DIGITS),
    sample(SYMBOLS),
  ]

  while (chars.length < targetLength) {
    chars.push(sample(PASSWORD_ALPHABET))
  }

  return shuffle(chars).join('')
}

export function createSubscriptionToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function buildSubscriptionUrl(token: string) {
  return `https://privatevp.space/api/sub/${token}`
}

export function extractSubscriptionToken(input: string) {
  const raw = String(input || '').trim()
  if (!raw) return ''

  try {
    const url = new URL(raw)
    const parts = url.pathname.split('/').filter(Boolean)
    const subIndex = parts.indexOf('sub')
    if (subIndex >= 0 && parts[subIndex + 1]) {
      return parts[subIndex + 1]
    }
  } catch {
    // raw token or id
  }

  const stripped = raw.replace(/^.*\/api\/sub\//, '')
  return stripped.split(/[?#]/)[0].trim()
}

export function buildSubscriptionLookupWhere(input: string) {
  const key = extractSubscriptionToken(input)
  return {
    OR: [
      { id: key },
      { userId: key },
      { subscriptionUrl: buildSubscriptionUrl(key) },
    ],
  }
}

export function createPromoCode(prefix: string, length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  while (suffix.length < length) {
    suffix += alphabet[randomInt(alphabet.length)]
  }
  return `${prefix}-${suffix}`
}

export function getMtprotoProxyUrl(host: string, name: string) {
  const pool = getMtprotoProxyPool()
  if (pool.length) {
    return pool[randomInt(pool.length)]
  }

  if (process.env.TG_PROXY_URL) {
    return process.env.TG_PROXY_URL
  }

  const secret = 'ee' + crypto.createHash('md5').update(`${host}${name}privat`).digest('hex') + '676f6f676c652e636f6d'
  return `tg://proxy?server=${host}&port=543&secret=${secret}`
}

export const TG_PROXY_URL = 'tg://proxy?server=144.31.220.23&port=543&secret=eed2709de4ef1349ff8f13dc64efb17311676f6f676c652e636f6d'

function buildProxyUrl(server: string, port: string | number, secret: string) {
  return `tg://proxy?server=${server}&port=${port}&secret=${secret}`
}

function parseProxyEntry(entry: string) {
  const trimmed = entry.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('tg://')) return trimmed

  const parts = trimmed.split(':').map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 3) {
    const [server, port, ...secretParts] = parts
    const secret = secretParts.join(':')
    if (!server || !port || !secret) return null
    return buildProxyUrl(server, port, secret)
  }

  return null
}

function getMtprotoProxyPool() {
  const raw = process.env.TG_PROXY_POOL || ''
  if (!raw) return []
  return raw
    .split(/[\n,;]+/)
    .map(parseProxyEntry)
    .filter((val): val is string => Boolean(val))
}
