import prisma from '@/lib/db'
import { Client } from 'ssh2'

async function getStats(host: string, port: number, user: string, pass: string): Promise<{ load: number, connections: number, sessions: {user: string, ip: string}[] } | null> {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('ready', () => {
      // Get CPU/RAM and Established connections on common VPN ports
      const vpnPortsRegex = "80|443|448|8443|9443|10443|11443|12443|15113|15443|15444|15943|15103|2053|2082|2083|2086|2087|2096"
      const cmd = `top -bn1 | grep "Cpu(s)"; free -m | grep Mem; pgrep -x iperf3 >/dev/null && echo "IPERF_RUNNING" || true; ss -tun state established | awk '{print $4, $5}' | grep -E ".*:(${vpnPortsRegex}) .*" | awk '{print $2}' | rev | cut -d: -f2- | rev | tr -d '[]' | sort -u | grep -v "127.0.0.1" | grep -v "::1"; [ -f /var/log/xray/access.log ] && tail -n 200 /var/log/xray/access.log | grep "accepted" | grep "email:" | awk '{print $1, $2, $3, $NF}' || echo "NO_LOGS"`
      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end()
          return resolve(null)
        }
        let output = ''
        stream.on('data', (data: Buffer) => {
          output += data.toString()
        }).on('close', () => {
          conn.end()
          try {
            const lines = output.trim().split('\n')
            let cpuUsage = 0
            let ramUsage = 0
            let iperfRunning = false
            let connections = 0
            const sessions: {user: string, ip: string}[] = []

            for (const line of lines) {
              if (line.includes('Cpu(s)')) {
                const idleMatch = line.match(/(\d+\.?\d*)\s*id/)
                if (idleMatch) cpuUsage = 100 - parseFloat(idleMatch[1])
              } else if (line.includes('IPERF_RUNNING')) {
                iperfRunning = true
              } else if (line.includes('Mem:')) {
                const parts = line.split(/\s+/).filter(Boolean)
                if (parts.length >= 7) {
                  const total = parseFloat(parts[1])
                  const available = parseFloat(parts[6])
                  const realUsed = Math.max(0, total - available)
                  ramUsage = (realUsed / total) * 100
                }
              } else if (line.includes('email:')) {
                const parts = line.split(/\s+/)
                if (parts.length >= 4) {
                  const dateStr = parts[0].replace(/\//g, '-')
                  const timeStr = parts[1]
                  const ip = parts[2].split(':')[0]
                  const email = parts[3].replace('email:', '')
                  
                  const logDate = new Date(`${dateStr} ${timeStr}`)
                  const isRecent = (Date.now() - logDate.getTime()) < 180000 // 3 minutes
                  
                  if (isRecent && ip && email && !sessions.find(s => s.ip === ip && s.user === email)) {
                    sessions.push({ user: email, ip })
                  }
                }
              } else if (line.includes('.') || line.includes(':')) {
                if (!line.includes('Cpu') && !line.includes('Mem') && !line.includes('Address') && !line.includes('NO_LOGS')) {
                  connections++
                }
              }
            }
            // CPU is the primary signal. Memory only matters when real used memory
            // (without page cache) is actually high.
            const effectiveRamUsage = ramUsage >= 85 ? ramUsage : Math.max(0, ramUsage - 10)

            const effectiveCpuUsage = iperfRunning ? Math.min(cpuUsage, effectiveRamUsage) : cpuUsage

            resolve({ 
              load: Math.round(Math.max(effectiveCpuUsage, effectiveRamUsage)),
              connections,
              sessions
            })
          } catch (e) {
            resolve(null)
          }
        })
      })
    }).on('error', () => {
      resolve(null)
    }).connect({
      host,
      port,
      username: user,
      password: pass,
      timeout: 10000
    })
  })
}

async function updateAllLoads() {
  console.log(`[${new Date().toISOString()}] Updating server loads...`)
  const locations = await prisma.location.findMany({
    where: { 
      isActive: true,
      sshUser: { not: null },
      sshPass: { not: null }
    }
  })

  for (const loc of locations as any[]) {
    try {
      const stats = await getStats(loc.host, 22, loc.sshUser!, loc.sshPass!)
      if (stats) {
        const { load, connections, sessions } = stats
        console.log(`- ${loc.name} (${loc.host}): ${load}%, Connections: ${connections}, Sessions: ${sessions.length}`)
        await prisma.location.update({
          where: { id: loc.id },
          data: { 
            load: Math.max(1, load),
            liveConnections: connections,
            lastLoadCheck: new Date()
          }
        })

        for (const sess of sessions) {
          const sub = await prisma.subscription.findUnique({ where: { id: sess.user } })
          if (sub) {
            await (prisma as any).activeSession.upsert({
              where: {
                userId_locationId_ip: {
                  userId: sub.userId,
                  locationId: loc.id,
                  ip: sess.ip
                }
              },
              update: { lastSeen: new Date() },
              create: {
                userId: sub.userId,
                locationId: loc.id,
                ip: sess.ip,
                lastSeen: new Date()
              }
            })
          }
        }

        const lastLog = await prisma.connectionLog.findFirst({
          where: { locationId: loc.id },
          orderBy: { timestamp: 'desc' }
        })

        const TEN_MINUTES = 10 * 60 * 1000
        if (!lastLog || (new Date().getTime() - lastLog.timestamp.getTime() > TEN_MINUTES)) {
          await prisma.connectionLog.create({
            data: {
              locationId: loc.id,
              count: connections,
            }
          })
          console.log(`  - Logged historical connection count for ${loc.name}`)
        }
      } else {
        console.warn(`- Failed to reach ${loc.name} (${loc.host}) via SSH`)
        // Optionally update lastLoadCheck or something to indicate it failed
      }
    } catch (e) {
      console.error(`- Failed to update ${loc.host}:`, e)
    }
  }
}

async function main() {
  // Cleanup old sessions on start
  await (prisma as any).activeSession.deleteMany({
    where: {
      lastSeen: {
        lt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes threshold
      }
    }
  })

  while (true) {
    await updateAllLoads()
    
    // Periodically cleanup older sessions
    await (prisma as any).activeSession.deleteMany({
      where: {
        lastSeen: {
          lt: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes threshold
        }
      }
    })

    await new Promise(r => setTimeout(r, 60000))
  }
}

main().catch(console.error)
