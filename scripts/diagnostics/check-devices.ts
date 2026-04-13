import prisma from '@/lib/db'
import { Client } from 'ssh2'
import { PLANS } from '@/lib/store'

function getDeviceLimitsMap() {
  const limits: Record<string, number> = {}
  for (const plan of PLANS) {
    limits[plan.id.toLowerCase()] = plan.devicesCount
  }
  return limits
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

      conn.exec(cmd, () => {
        conn.end()
        resolve(true)
      })
    }).connect({
      host: loc.host,
      port: 22,
      username: loc.sshUser || 'root',
      password: loc.sshPass
    })
  })
}

async function main() {
  console.log('[DEVICES] Starting device policy monitor (Interval: 5m)')
  while (true) {
    try {
      const limitsMap = getDeviceLimitsMap()
      const activeSubscriptions = await prisma.subscription.findMany({
        where: { status: 'active' },
        select: { userId: true, planId: true }
      })
      const planByUserId = new Map(activeSubscriptions.map((sub) => [sub.userId, sub.planId.toLowerCase()]))

      const activeWindow = new Date(Date.now() - 5 * 60 * 1000)
      const sessions = await (prisma as any).activeSession.findMany({
        where: {
          lastSeen: { gte: activeWindow }
        },
        orderBy: { lastSeen: 'desc' }
      })

      const ipStateByUser = new Map<string, Map<string, Date>>()
      for (const session of sessions) {
        const userId = String(session.userId)
        const ip = String(session.ip)
        const currentByIp = ipStateByUser.get(userId) || new Map<string, Date>()
        const seenAt = new Date(session.lastSeen)
        const previousSeenAt = currentByIp.get(ip)
        if (!previousSeenAt || previousSeenAt.getTime() < seenAt.getTime()) {
          currentByIp.set(ip, seenAt)
        }
        ipStateByUser.set(userId, currentByIp)
      }

      const ipsToBlock = new Set<string>()
      for (const [userId, byIp] of ipStateByUser.entries()) {
        const planId = planByUserId.get(userId)
        if (!planId) continue

        const limit = limitsMap[planId] || 999
        const rankedIps = Array.from(byIp.entries())
          .sort((left, right) => right[1].getTime() - left[1].getTime())
          .map(([ip]) => ip)

        if (rankedIps.length > limit) {
          const overflowIps = rankedIps.slice(limit)
          console.log(`[DEVICES] User ${userId} on ${planId} exceeded ${limit} devices, blocking: ${overflowIps.join(', ')}`)
          for (const ip of overflowIps) {
            ipsToBlock.add(ip)
          }
        }
      }

      const locations = await prisma.location.findMany({
        where: { isActive: true, sshPass: { not: null } }
      })

      for (const loc of locations as any[]) {
        await applyIptables(loc, Array.from(ipsToBlock))
      }

      console.log(`[DEVICES] Applied device policy. Blocked IPs: ${ipsToBlock.size}`)
    } catch (err) {
      console.error('[DEVICES] Error in cycle:', err)
    }
    await new Promise(r => setTimeout(r, 5 * 60 * 1000))
  }
}

main().catch(console.error)
