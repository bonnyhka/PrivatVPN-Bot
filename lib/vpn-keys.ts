import crypto from 'crypto'

export function deriveShadowsocks2022Key(uuid: string, len: 16 | 32 = 32): string {
  // Derive a PSK from the user's UUID using SHA-256.
  const hash = crypto.createHash('sha256').update(uuid).digest()
  return hash.subarray(0, len).toString('base64')
}
