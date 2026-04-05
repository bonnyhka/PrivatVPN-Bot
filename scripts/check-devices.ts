import prisma from '@/lib/db'
import { Client } from 'ssh2'
import { PLANS } from '@/lib/store'

function getDeviceLimitsMap() {
  const limits: Record<string, number> = {}
  for (const plan of PLANS) {
    limits[plan.id.toLowerCase()] = plan.devicesCount + 1 // +1 tolerance
  }
  return limits
}

async function getConnectionsLog(loc: any): Promise<string[]> {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('error', (err) => {
      console.error(`[DEVICES] SSH Err for ${loc.name}:`, err.message)
      resolve([])
    })
    conn.on('ready', () => {
      conn.exec(`journalctl -u sing-box --since '15 minutes ago' --no-pager | grep 'accepted'`, (err, stream) => {
        let output = ''
        stream.on('data', (d: any) => output += d.toString())
        stream.on('close', () => {
          conn.end()
          resolve(output.split('\n'))
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

async function applyIptables(loc: any, ipsToBlock: string[]) {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('error', () => resolve(false))
    conn.on('ready', () => {
      let cmd = `
iptables -N device-limits 2>/dev/null || true
iptables -C INPUT -j device-limits 2>/dev/null || iptables -I INPUT 1 -j device-limits
iptables -F device-limits
`
      for (const ip of ipsToBlock) {
        cmd += `iptables -A device-limits -s ${ip} -j DROP\n`
      }

      conn.exec(cmd, (err, stream) => {
        stream.on('close', () => {
          conn.end()
          resolve(true)
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
  const limitsMap = getDeviceLimitsMap()
  const activeSubs = await prisma.subscription.findMany({
    where: { status: 'active' },
    select: { vlessUuid: true, planId: true }
  })
  
  if (activeSubs.length === 0) return

  // uuid -> Set<IP>
  const uuidIps: Record<string, Set<string>> = {}

  const locations = await prisma.location.findMany({ where: { isActive: true, sshPass: { not: null } } })
  
  // Aggregate logs
  for (const loc of locations) {
    const lines = await getConnectionsLog(loc)
    
    for (const line of lines) {
      if (!line.includes('user: ')) continue
      
      const ipMatch = line.match(/tcp:([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+):[0-9]+/)
      const userMatch = line.match(/user: ([a-f0-9\-]+)/i)
      
      if (ipMatch && userMatch) {
        const ip = ipMatch[1]
        const uuid = userMatch[1].toLowerCase()
        if (!uuidIps[uuid]) uuidIps[uuid] = new Set()
        uuidIps[uuid].add(ip)
      }
    }
  }

  // Find excess IPs
  const allExcessIps = new Set<string>()

  for (const sub of activeSubs) {
    if (!sub.vlessUuid) continue;
    const uuid = sub.vlessUuid.toLowerCase()
    
    if (uuidIps[uuid]) {
      const activeIpsArray = Array.from(uuidIps[uuid])
      const limit = limitsMap[sub.planId.toLowerCase()] || 999
      
      if (activeIpsArray.length > limit) {
        const excess = activeIpsArray.slice(limit)
        console.log(`[DEVICES] UUID ${uuid} exceeded limit ${limit}. Banning ${excess.length} extra IP(s): ${excess.join(', ')}`)
        for (const eIp of excess) {
          allExcessIps.add(eIp)
        }
      }
    }
  }

  const ipsToBlock = Array.from(allExcessIps)
  console.log(`[DEVICES] Total excess IPs across network: ${ipsToBlock.length}`)

  // Apply to all nodes (even if no excess IPs, to flush the existing bans!)
  for (const loc of locations) {
    await applyIptables(loc, ipsToBlock)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
