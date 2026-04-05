import prisma from '@/lib/db'
import { Client } from 'ssh2'
import * as fs from 'fs/promises'
import { PLANS } from '../lib/store'
const CACHE_FILE = '/root/.vpn-traffic-cache.json'

async function run() {
  let cache: Record<string, Record<string, { up: number, down: number }>> = {}
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8')
    cache = JSON.parse(data)
  } catch (e) {
    // cache doesn't exist
  }

  const locations = await prisma.location.findMany({ where: { isActive: true } })
  const subs = await prisma.subscription.findMany({ where: { status: 'active' } })
  
  const uuidToSub = new Map<string, any>()
  for (const s of subs) {
    uuidToSub.set(s.id, s)
  }

  for (const loc of locations) {
    console.log(`Checking traffic for ${loc.name} (${loc.host})...`)
    if (!cache[loc.id]) cache[loc.id] = {}

    try {
      const statsJson = await getStatsViaSSH(loc.host, 'root', process.env.VPN_NODE_PASSWORD || '')
      const stats = JSON.parse(statsJson)
      
      const currentStats = new Map<string, { up: number, down: number }>()

      if (stats.stat && Array.isArray(stats.stat)) {
        for (const item of stats.stat) {
          // name format: user>>>subId>>>traffic>>>downlink
          const name = item.name.replace(/\\u003e/g, '>')
          const parts = name.split('>>>')
          if (parts[0] === 'user' && parts[2] === 'traffic') {
            const uuid = parts[1]
            const type = parts[3] // 'uplink' or 'downlink'
            const val = parseInt(item.value, 10) || 0

            if (!currentStats.has(uuid)) currentStats.set(uuid, { up: 0, down: 0 })
            const s = currentStats.get(uuid)!
            if (type === 'uplink') s.up = val
            if (type === 'downlink') s.down = val
          }
        }
      }

      // Process deltas
      for (const [uuid, current] of currentStats.entries()) {
        const sub = uuidToSub.get(uuid)
        if (!sub) continue

        const c = cache[loc.id][uuid] || { up: 0, down: 0 }
        let deltaUp = 0
        let deltaDown = 0

        // Handles service restarts (current < cached)
        if (current.up < c.up) deltaUp = current.up
        else deltaUp = current.up - c.up

        if (current.down < c.down) deltaDown = current.down
        else deltaDown = current.down - c.down

        const totalDelta = BigInt(deltaUp) + BigInt(deltaDown)
        
        if (totalDelta > BigInt(0)) {
          console.log(`[${loc.name}] User ${uuid} used ${totalDelta} bytes`)
          const newTotal = sub.trafficUsed + totalDelta
          sub.trafficUsed = newTotal

          let newStatus = sub.status
          const plan = PLANS.find(p => p.id === sub.planId)
          if (plan && plan.trafficLimit) {
            const limitBigInt = BigInt(Math.floor(plan.trafficLimit))
            if (newTotal >= limitBigInt) {
               console.log(`User ${sub.id} exceeded limit! (${newTotal}/${limitBigInt})`)
               newStatus = 'expired'
            }
          }

          await prisma.subscription.update({
            where: { id: sub.id },
            data: { trafficUsed: newTotal, status: newStatus }
          })
        }

        // Update cache
        cache[loc.id][uuid] = current
      }
    } catch (e: any) {
      console.error(`Failed to get stats for ${loc.name}:`, e.message)
    }
  }

  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2))
  console.log('Traffic sync completed.')
}

function getStatsViaSSH(host: string, username: string, password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    conn.on('ready', () => {
      conn.exec('grpcurl -plaintext -import-path /tmp -proto stats.proto -d \'{"pattern":"","reset":false}\' 127.0.0.1:10086 v2ray.core.app.stats.command.StatsService.QueryStats', (err: any, stream: any) => {
        if (err) { conn.end(); return reject(err) }
        let out = ''
        stream.on('data', (d: any) => { out += d.toString() })
        stream.on('close', () => { conn.end(); resolve(out || '{}') })
      })
    }).on('error', (err: any) => reject(err)).connect({ host, port: 22, username, password, readyTimeout: 10000 })
  })
}

run().catch(console.error)
