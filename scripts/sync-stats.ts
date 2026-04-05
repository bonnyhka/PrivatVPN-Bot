import prisma from '@/lib/db'
import { Client } from 'ssh2'

async function getStats(loc: any) {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('ready', () => {
      // Query stats via xray api
      // pattern is empty for all stats
      const cmd = '/usr/local/bin/xray api stats query --server=127.0.0.1:10085 --pattern ""'
      
      conn.exec(cmd, (err: Error | undefined, stream: any) => {
        let output = ''
        stream.on('data', (d: Buffer) => output += d.toString()).on('close', () => {
          conn.end()
          try {
            const data = JSON.parse(output)
            resolve(data.stat || [])
          } catch (e) {
            resolve([])
          }
        })
      })
    }).connect({
      host: loc.host,
      port: 22,
      username: 'root',
      password: loc.sshPass
    })
  })
}

async function main() {
  const locations = await prisma.location.findMany({ where: { isActive: true, sshPass: { not: null } } })
  const allStats: any[] = []

  for (const loc of locations) {
    const stats: any = await getStats(loc)
    allStats.push(...stats)
  }

  // Stats are in format: "user>>>[email]>>>traffic>>>downlink"
  // email is our sub.id
  const trafficMap = new Map<string, bigint>()

  for (const s of allStats) {
    if (s.name && s.name.startsWith('user>>>')) {
      const parts = s.name.split('>>>')
      const subId = parts[1]
      const value = BigInt(s.value || 0)
      
      const current = trafficMap.get(subId) || BigInt(0)
      trafficMap.set(subId, current + value)
    }
  }

  for (const [subId, traffic] of Array.from(trafficMap.entries())) {
    try {
      const sub = await prisma.subscription.findUnique({ where: { id: subId } })
      if (!sub) continue

      // Calculate delta
      const currentTraffic = traffic
      const previousTraffic = sub.trafficUsed
      
      let delta = BigInt(0)
      if (currentTraffic >= previousTraffic) {
        delta = currentTraffic - previousTraffic
      } else {
        // xray likely restarted or sub reset
        delta = currentTraffic
      }

      await prisma.subscription.update({
        where: { id: subId },
        data: { trafficUsed: currentTraffic }
      })
      
      if (delta > BigInt(0)) {
        console.log(`Updated sub ${subId}: +${delta} bytes (total: ${currentTraffic})`)

        // Record hourly log - append to current hour store
        const now = new Date()
        const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0)
        
        const existingLog = await (prisma as any).trafficLog.findFirst({
          where: {
            subscriptionId: subId,
            timestamp: {
              gte: startOfHour
            }
          }
        })

        if (!existingLog) {
          await (prisma as any).trafficLog.create({
            data: {
              subscriptionId: subId,
              bytes: delta,
              timestamp: startOfHour
            }
          })
          console.log(`Created hourly log for ${subId}: ${delta} bytes`)
        } else {
          // Add delta to existing log for the current hour
          await (prisma as any).trafficLog.update({
            where: { id: existingLog.id },
            data: { bytes: BigInt(existingLog.bytes) + delta }
          })
          console.log(`Added to hourly log for ${subId}: +${delta} bytes`)
        }
      }
    } catch (e) {
      // Sub might not exist or other error
      console.error(`Error updating stats for ${subId}:`, e)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
