import prisma from '@/lib/db'
import { PLANS } from './store'

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
