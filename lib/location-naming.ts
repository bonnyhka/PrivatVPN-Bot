import type { PrismaClient } from '@prisma/client'

/** ISO 3166-1 alpha-2 from English country name (lowercase key). */
export const COUNTRY_TO_FLAG_ISO: Record<string, string> = {
  germany: 'DE',
  netherlands: 'NL',
  holland: 'NL',
  finland: 'FI',
  france: 'FR',
  poland: 'PL',
  estonia: 'EE',
  latvia: 'LV',
  lithuania: 'LT',
  kazakhstan: 'KZ',
  singapore: 'SG',
  japan: 'JP',
  usa: 'US',
  'united states': 'US',
  uk: 'GB',
  'united kingdom': 'GB',
  russia: 'RU',
  spain: 'ES',
  sweden: 'SE',
  turkey: 'TR',
  ukraine: 'UA',
}

export function resolveFlagIso(country: string, flagHint?: string | null): string {
  const raw = (flagHint ?? '').trim()
  const h = raw.toUpperCase()
  // ISO alpha-2 (Latin letters only; skips emoji / garbage from legacy rows)
  if (h.length === 2 && /^[A-Z]{2}$/.test(h)) return h
  const key = country.trim().toLowerCase()
  return COUNTRY_TO_FLAG_ISO[key] || 'UN'
}

/** Next display name like "Netherlands #2" for this country (internal DB field). */
export async function nextLocationName(
  prisma: PrismaClient,
  country: string,
  excludeId?: string
): Promise<string> {
  const normalized = country.trim() || 'Unknown'
  const count = await prisma.location.count({
    where: {
      country: normalized,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  })
  return `${normalized} #${count + 1}`
}
