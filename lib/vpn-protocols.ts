export const DEFAULT_REALITY_SNI = 'dl.google.com'
export const ALT_VLESS_PORT = 8443
export const PLAN_HEALTHCHECK_UUIDS = {
  scout: '11111111-1111-4111-8111-111111111111',
  guardian: '22222222-2222-4222-8222-222222222222',
  fortress: '33333333-3333-4333-8333-333333333333',
  citadel: '44444444-4444-4444-8444-444444444444',
} as const

export const PLAN_ALLOWED_COUNTRIES: Record<string, string[]> = {
  scout: ['germany', 'russia'],
  guardian: ['germany', 'netherlands', 'russia'],
  fortress: ['germany', 'netherlands', 'finland', 'russia'],
  citadel: ['germany', 'netherlands', 'finland', 'russia'],
}

export function isPlanAllowedInLocation(planId: string, country: string): boolean {
  if (!country) return true
  const normalizedPlan = normalizeManagedPlanId(planId)
  const allowed = PLAN_ALLOWED_COUNTRIES[normalizedPlan] || PLAN_ALLOWED_COUNTRIES['citadel']
  if (!Array.isArray(allowed)) return true
  return allowed.includes(country.toLowerCase().trim())
}

export const PLAN_PROTOCOLS = {
  scout: {
    vless: 9443,
    speedMbps: 50,
    rateMbps: 52,
    ceilMbps: 55,
    trafficClassId: '50',
  },
  guardian: {
    vless: 11443,
    speedMbps: 100,
    rateMbps: 105,
    ceilMbps: 110,
    trafficClassId: '100',
  },
  fortress: {
    vless: 10443,
    speedMbps: 500,
    rateMbps: 525,
    ceilMbps: 550,
    trafficClassId: '500',
  },
  citadel: {
    vless: 12443,
    speedMbps: 1000,
    rateMbps: 1025,
    ceilMbps: 1050,
    trafficClassId: '1000',
  },
} as const

export type ManagedPlanId = keyof typeof PLAN_PROTOCOLS

const PLAN_IDS = Object.keys(PLAN_PROTOCOLS) as ManagedPlanId[]

export function getManagedPlanIds() {
  return PLAN_IDS
}

export function normalizeManagedPlanId(planId?: string | null): ManagedPlanId {
  if (planId && planId in PLAN_PROTOCOLS) {
    return planId as ManagedPlanId
  }
  return 'citadel'
}

export function getPlanVlessPort(planId?: string | null) {
  return PLAN_PROTOCOLS[normalizeManagedPlanId(planId)].vless
}


export function getPlanSpeedLimitMbps(planId?: string | null) {
  return PLAN_PROTOCOLS[normalizeManagedPlanId(planId)].speedMbps
}

export function getPlanTrafficClass(planId?: string | null) {
  const normalized = normalizeManagedPlanId(planId)
  return {
    classId: PLAN_PROTOCOLS[normalized].trafficClassId,
    rateMbps: PLAN_PROTOCOLS[normalized].rateMbps,
    ceilMbps: PLAN_PROTOCOLS[normalized].ceilMbps,
  }
}

export function getPlanIdForVlessPort(port: number): ManagedPlanId {
  if (port === ALT_VLESS_PORT) return 'citadel'
  for (const planId of PLAN_IDS) {
    if (PLAN_PROTOCOLS[planId].vless === port) {
      return planId
    }
  }
  return 'citadel'
}

export function getAllManagedPorts() {
  const ports = new Set<number>([ALT_VLESS_PORT])
  for (const planId of PLAN_IDS) {
    const config = PLAN_PROTOCOLS[planId]
    ports.add(config.vless)
  }
  return Array.from(ports).sort((left, right) => left - right)
}
