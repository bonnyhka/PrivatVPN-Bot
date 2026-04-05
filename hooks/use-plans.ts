import { useState, useEffect } from 'react'
import type { Plan } from '@/lib/types'
import { PLANS as DEFAULT_PLANS } from '@/lib/store'

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        setPlans(data)
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch dynamic plans:', err)
        setIsLoading(false)
      })
  }, [])

  return { plans, isLoading, setPlans }
}
