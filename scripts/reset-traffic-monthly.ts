import prisma from '@/lib/db'
import { exec } from 'child_process'
import path from 'path'

async function runCycle() {
  try {
    console.log(`[TRAFFIC-RESET] Starting traffic evaluation cycle at ${new Date().toISOString()}`)
    const now = new Date()
    
    // Find subscriptions where lastTrafficReset is older than 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const subs = await prisma.subscription.findMany({
      where: {
        status: 'active',
        lastTrafficReset: {
          lt: thirtyDaysAgo
        }
      }
    })

    if (subs.length === 0) {
      console.log('[TRAFFIC-RESET] No accounts need resetting at this time.')
      return
    }

    console.log(`[TRAFFIC-RESET] Found ${subs.length} subscriptions that have reached their 30-day traffic cycle limit.`)

    let resetCount = 0
    for (const sub of subs) {
      try {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            trafficUsed: 0,
            lastTrafficReset: now
          }
        })
        resetCount++
        console.log(`[TRAFFIC-RESET] Reset traffic for subscription id: ${sub.id} (UserId: ${sub.userId})`)
      } catch (e) {
        console.error(`[TRAFFIC-RESET] Failed to reset traffic for sub ${sub.id}:`, e)
      }
    }

    // Trigger a system-wide node configuration sync if any records changed
    if (resetCount > 0) {
      const scriptPath = path.join(__dirname, 'sync-vpn-singbox.ts')
      console.log(`[TRAFFIC-RESET] Triggering sync script: npx tsx ${scriptPath}`)
      
      exec(`npx tsx ${scriptPath}`, (error) => {
        if (error) {
          console.error(`[TRAFFIC-RESET] Sync trigger failed: ${error.message}`)
          return
        }
        console.log(`[TRAFFIC-RESET] Sync completed successfully. Nodes are updated with new quotas.`)
      })
    }

  } catch (err) {
    console.error(`[TRAFFIC-RESET] Cycle error:`, err)
  }
}

async function main() {
  console.log('[TRAFFIC-RESET] Process initialized via PM2. Commencing 12-hour monitoring loop.')
  await runCycle()
  setInterval(runCycle, 12 * 60 * 60 * 1000)
}

main().catch(console.error)
