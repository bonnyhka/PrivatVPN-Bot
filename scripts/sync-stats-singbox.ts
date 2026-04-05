import prisma from '@/lib/db'
import { Client } from 'ssh2'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SYNC_STATUS_FILE = path.resolve(__dirname, '..', 'data', 'traffic-sync-status.json')

const STATS_PROTO = `syntax = "proto3";
package v2ray.core.app.stats.command;
service StatsService {
  rpc QueryStats (QueryStatsRequest) returns (QueryStatsResponse);
}
message QueryStatsRequest {
  string pattern = 1;
  bool reset = 2;
}
message QueryStatsResponse {
  repeated Stat stat = 1;
}
message Stat {
  string name = 1;
  int64 value = 2;
}`

function writeSyncStatus(payload: Record<string, unknown>) {
  try {
    fs.mkdirSync(path.dirname(SYNC_STATUS_FILE), { recursive: true })
    fs.writeFileSync(SYNC_STATUS_FILE, JSON.stringify(payload, null, 2))
  } catch (error) {
    console.error('[SYNC-STATS] Failed to write sync status:', error)
  }
}

/**
 * Query per-user traffic stats from sing-box via the Clash API (HTTP REST on port 9090).
 * Endpoint: GET http://127.0.0.1:9090/v1/proxies — returns connection stats per inbound tag.
 * But more useful is: the V2Ray stats API at port 10086 via grpcurl.
 * 
 * Since grpcurl hangs and xray CLI dials wrong port, we use SSH tunneling to call
 * the sing-box Clash API endpoint directly via HTTP over SSH exec.
 */
async function getStatsViaSSH(loc: any): Promise<Record<string, bigint>> {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('ready', () => {
      // Query Clash API /connections for per-connection stats
      // Note: connections endpoint tracks active connections but not historical totals
      // The V2Ray stats API at 10086 is the reliable source - query it via curl locally
      const cmd = `curl -s --max-time 5 http://127.0.0.1:9090/v1/stats/log 2>/dev/null || curl -s --max-time 5 http://127.0.0.1:9090/version 2>/dev/null | head -1`
      conn.exec(cmd, (err, stream) => {
        if (err) { conn.end(); return resolve({}) }
        let output = ''
        stream.on('data', (d: Buffer) => output += d.toString())
          .stderr.on('data', () => {})
        stream.on('close', () => {
          conn.end()
          resolve({})
        })
      })
    }).on('error', (err: Error) => {
      console.error(`SSH error (${loc.name}):`, err.message)
      resolve({})
    }).connect({
      host: loc.host,
      port: 22,
      username: 'root',
      password: loc.sshPass
    })
  })
}

/**
 * Query V2Ray gRPC stats via the correct endpoint using grpcurl on remote.
 * Since direct gRPC from our server hangs, we exec grpcurl on the remote server itself.
 */
async function getV2RayStats(loc: any): Promise<Record<string, bigint>> {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('ready', () => {
      const queryCmd = `
        export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"
        if ! command -v grpcurl >/dev/null 2>&1; then
          if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
            apt-get update >/dev/null 2>&1 && apt-get install -y curl wget >/dev/null 2>&1
          fi
          if command -v wget >/dev/null 2>&1; then
            wget -qO- https://github.com/fullstorydev/grpcurl/releases/download/v1.9.1/grpcurl_1.9.1_linux_x86_64.tar.gz | tar -xz -C /usr/local/bin grpcurl
          elif command -v curl >/dev/null 2>&1; then
            curl -fsSL https://github.com/fullstorydev/grpcurl/releases/download/v1.9.1/grpcurl_1.9.1_linux_x86_64.tar.gz | tar -xz -C /usr/local/bin grpcurl
          fi
          chmod +x /usr/local/bin/grpcurl 2>/dev/null || true
        fi
        cat > /tmp/stats.proto << 'PROTOEOF'
${STATS_PROTO}
PROTOEOF
        GRPCURL_BIN="$(command -v grpcurl || true)"
        [ -n "$GRPCURL_BIN" ] || exit 127
        "$GRPCURL_BIN" -plaintext -import-path /tmp -proto stats.proto -d '{"pattern":"","reset":true}' 127.0.0.1:10086 v2ray.core.app.stats.command.StatsService/QueryStats
      `
      
      conn.exec(queryCmd, (err, stream) => {
        if (err) { conn.end(); return resolve({}) }
        let output = ''
        stream.on('data', (d: Buffer) => output += d.toString())
          .stderr.on('data', (d: Buffer) => {
            const msg = d.toString().trim()
            if (msg && !msg.includes('reflexion')) console.error(`[${loc.name}] gRPC error:`, msg)
          })
        stream.on('close', () => {
          conn.end()
          try {
            const out = output.trim()
            if (!out) return resolve({})
            
            const result: Record<string, bigint> = {}
            const parsed = JSON.parse(out)
            const stats = parsed.stat || []
            for (const s of stats) {
              if (s.name && s.name.startsWith('user>>>') && s.name.includes('>>>traffic>>>')) {
                const parts = s.name.split('>>>')
                const subId = parts[1]
                const value = BigInt(s.value || '0')
                result[subId] = (result[subId] || BigInt(0)) + value
              }
            }
            if (Object.keys(result).length > 0) {
              console.log(`[${loc.name}] Collected stats for ${Object.keys(result).length} users`)
            }
            resolve(result)
          } catch (e) {
            if (output.trim()) console.error(`[${loc.name}] Parse error:`, output.slice(0, 200))
            resolve({})
          }
        })
      })
    }).on('error', (err: Error) => {
      console.error(`[${loc.name}] SSH error:`, err.message)
      resolve({})
    }).connect({
      host: loc.host,
      port: 22,
      username: 'root',
      password: loc.sshPass,
      readyTimeout: 30000 // Increased timeout for slow RU/EU connections
    })
  })
}

async function runCycle() {
  const startedAt = new Date().toISOString()
  try {
    console.log(`[SYNC-STATS] Starting sync cycle at ${startedAt}`)
    const locations = await (prisma as any).location.findMany({ where: { isActive: true, sshPass: { not: null } } })
    const subscriptions = await (prisma as any).subscription.findMany({ where: { status: 'active' } })

    // Create a reverse map to link UUIDs to sub IDs
    const uuidToSubId: Record<string, string> = {}
    for (const s of subscriptions) {
      if (s.vlessUuid) uuidToSubId[s.vlessUuid] = s.id
    }

    const trafficBySub: Record<string, bigint> = {}

    for (const loc of locations) {
      console.log(`[SYNC-STATS] Processing ${loc.name}...`)
      const stats = await getV2RayStats(loc)
      const locUsage = Object.keys(stats).length
      if (locUsage > 0) {
        console.log(`[SYNC-STATS]   Found traffic for ${locUsage} users on ${loc.name}`)
      }
      for (const [key, bytes] of Object.entries(stats)) {
        // If the key is a UUID, try to resolve to subId
        const subId = uuidToSubId[key] || key 
        trafficBySub[subId] = (trafficBySub[subId] || BigInt(0)) + bytes
      }
    }

    console.log(`[SYNC-STATS] trafficBySub map:`, Object.fromEntries(Object.entries(trafficBySub).map(([k,v]) => [k, v.toString()])))
    console.log(`[SYNC-STATS] Total subs with traffic delta: ${Object.keys(trafficBySub).length}`)

    let updated = 0
    const now = new Date()
    const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0)

    for (const sub of subscriptions) {
      const newUsage = trafficBySub[sub.id] || BigInt(0)
      if (newUsage > BigInt(0)) {
        const totalUsage = BigInt(sub.trafficUsed || 0) + newUsage
        await (prisma as any).subscription.update({
          where: { id: sub.id },
          data: { trafficUsed: totalUsage }
        })
        
        // Record or Update hourly log (storing delta)
        const existingLog = await (prisma as any).trafficLog.findFirst({
          where: {
            subscriptionId: sub.id,
            timestamp: { gte: startOfHour }
          }
        })

        if (!existingLog) {
          await (prisma as any).trafficLog.create({
            data: {
              subscriptionId: sub.id,
              bytes: newUsage,
              timestamp: startOfHour
            }
          })
        } else {
          await (prisma as any).trafficLog.update({
            where: { id: existingLog.id },
            data: { bytes: BigInt(existingLog.bytes) + newUsage }
          })
        }

        console.log(`[SYNC-STATS] Updated ${sub.id}: +${newUsage} bytes (total: ${totalUsage})`)
        updated++
      }
    }

    const completedAt = new Date().toISOString()
    writeSyncStatus({
      status: 'ok',
      startedAt,
      completedAt,
      updatedSubscriptions: updated,
    })

    console.log(`[SYNC-STATS] Sync cycle completed. Updated ${updated} subscriptions.`)
  } catch (err) {
    writeSyncStatus({
      status: 'error',
      startedAt,
      completedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    })
    console.error(`[SYNC-STATS] Cycle error:`, err)
  }
}

async function main() {
  console.log('[SYNC-STATS] Process initialized via PM2. Commencing 5-minute monitoring loop.')
  await runCycle()
  setInterval(runCycle, 5 * 60 * 1000)
}

main().catch(console.error)
