import prisma from '@/lib/db'
import { PLANS } from './store'

const DISPLAY_TRAFFIC_LIMITS: Record<string, number> = {
  scout: 100 * 1024 * 1024 * 1024,
  guardian: 200 * 1024 * 1024 * 1024,
  fortress: 500 * 1024 * 1024 * 1024,
}

export async function getDynamicPlans() {
  const configs = await prisma.planConfig.findMany()
  return PLANS.map(plan => {
    const override = configs.find(c => c.id === plan.id)
    if (override) {
      return {
        ...plan,
        price: override.price,
        features: JSON.parse(override.features),
        trafficLimit: override.trafficLimit === null ? Number.MAX_SAFE_INTEGER : Number(override.trafficLimit)
      }
    }
    return plan
  })
}

export function getDisplayTrafficLimit(plan?: { id?: string | null; trafficLimit?: number | null } | null) {
  if (!plan) return null

  const rawLimit = typeof plan.trafficLimit === 'number' ? plan.trafficLimit : null
  if (rawLimit && Number.isFinite(rawLimit) && rawLimit !== Number.MAX_SAFE_INTEGER) {
    return rawLimit
  }

  const planId = String(plan.id || '').trim()
  return DISPLAY_TRAFFIC_LIMITS[planId] || null
}
