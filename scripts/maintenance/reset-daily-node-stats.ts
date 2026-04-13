import prisma from '../lib/db'
import fs from 'fs'
import path from 'path'
import { getAppDayKey } from '../lib/day-boundary'

const NODE_TRAFFIC_FILE = path.resolve(__dirname, '..', 'data', 'location-traffic-accounting.json')

async function resetDailyStats() {
  console.log(`[RESET-DAILY] Starting reset at ${new Date().toISOString()} (Target: 00:00 MSK / 21:00 UTC)`)
  
  try {
    // 1. Reset Location LOAD and liveConnections in DB (optional, but good for cleanliness)
    await prisma.location.updateMany({
      data: {
        load: 0,
        liveConnections: 0,
        ping: 0
      }
    })

    // 2. Reset the Node Traffic JSON file (where "Today Traffic" is stored)
    if (fs.existsSync(NODE_TRAFFIC_FILE)) {
      try {
        const raw = fs.readFileSync(NODE_TRAFFIC_FILE, 'utf8')
        const data = JSON.parse(raw)
        
        if (data.locations) {
          for (const locId in data.locations) {
            const loc = data.locations[locId]
            // Reset both root level and vpnTraffic nested fields for compatibility
            loc.todayBytes = 0
            if (loc.vpnTraffic) {
              loc.vpnTraffic.todayBytes = 0
              loc.vpnTraffic.deltaBytes = 0
            }
          }
        }
        
        // Auto-rollover the 'day' key
        data.day = getAppDayKey(new Date())
        
        data.updatedAt = new Date().toISOString()
        fs.writeFileSync(NODE_TRAFFIC_FILE, JSON.stringify(data, null, 2))
        console.log(`[RESET-DAILY] Node traffic file reset successfully.`)
      } catch (err) {
        console.error(`[RESET-DAILY] Failed to parse/write node traffic file:`, err)
      }
    }

    // 3. Reset user-level session counts if needed
    await (prisma as any).activeSession.deleteMany({})

    console.log(`[RESET-DAILY] Daily cycle reset completed.`)
  } catch (err) {
    console.error(`[RESET-DAILY] Error during daily reset:`, err)
  }
}

// Loop to check time every minute
async function main() {
  console.log('[RESET-DAILY] Scheduler started. Monitoring for 21:00 UTC (00:00 MSK)...')
  
  setInterval(async () => {
    const now = new Date()
    const hours = now.getUTCHours()
    const minutes = now.getUTCMinutes()
    
    // Trigger exactly at 21:00 UTC
    if (hours === 21 && minutes === 0) {
      await resetDailyStats()
    }
  }, 60 * 1000)
}

main().catch(console.error)
