import prisma from '@/lib/db'
import { Client } from 'ssh2'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SYNC_SPEED_FILE = path.resolve(__dirname, '..', 'data', 'realtime-speed.json')

interface NodeSpeed {
  rxMBps: number
  txMBps: number
  timestamp: number
}

const speedData: Record<string, NodeSpeed> = {}

function writeSpeedData() {
  try {
    fs.mkdirSync(path.dirname(SYNC_SPEED_FILE), { recursive: true })
    const now = Date.now()
    
    // Clean up stale data (older than 15s)
    let totalRx = 0
    let totalTx = 0
    const activeData: Record<string, NodeSpeed> = {}
    
    for (const [locId, data] of Object.entries(speedData)) {
      if (now - data.timestamp < 15000) {
        activeData[locId] = data
        totalRx += data.rxMBps
        totalTx += data.txMBps
      }
    }

    const payload = {
      locations: activeData,
      totalRxMBps: totalRx,
      totalTxMBps: totalTx,
      timestamp: now
    }
    
    fs.writeFileSync(SYNC_SPEED_FILE, JSON.stringify(payload, null, 2))
  } catch (error) {
    console.error('[REALTIME-SPEED] Failed to write cache:', error)
  }
}

async function monitorLocation(loc: any) {
  return new Promise<void>((resolve) => {
    let lastRx = -1
    let lastTx = -1
    let lastTime = 0

    const conn = new Client()
    conn.on('ready', () => {
      console.log(`[REALTIME-SPEED] Connected to ${loc.name}. Starting monitor...`)
      // Find the main interface and start an infinite loop printing rx_bytes and tx_bytes
      const cmd = `
        IFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
        if [ -z "$IFACE" ]; then IFACE="eth0"; fi
        while true; do
          RX=$(cat /sys/class/net/$IFACE/statistics/rx_bytes 2>/dev/null || echo 0)
          TX=$(cat /sys/class/net/$IFACE/statistics/tx_bytes 2>/dev/null || echo 0)
          echo "$RX $TX"
          sleep 1.5
        done
      `
      conn.exec(cmd, (err, stream) => {
        if (err) {
          console.error(`[REALTIME-SPEED] Exec error on ${loc.name}:`, err)
          conn.end()
          setTimeout(() => monitorLocation(loc), 5000)
          return
        }
        
        stream.on('data', (d: Buffer) => {
          const lines = d.toString().trim().split('\n')
          for (const line of lines) {
            const parts = line.split(' ')
            if (parts.length === 2) {
              const currentRx = parseInt(parts[0], 10)
              const currentTx = parseInt(parts[1], 10)
              const currentTime = Date.now()

              if (lastRx !== -1 && lastTx !== -1 && lastTime !== 0) {
                const timeDiffSec = (currentTime - lastTime) / 1000
                if (timeDiffSec > 0) {
                  const rxDiff = currentRx - lastRx
                  const txDiff = currentTx - lastTx
                  
                  const rxMBps = (rxDiff / timeDiffSec) / (1024 * 1024)
                  const txMBps = (txDiff / timeDiffSec) / (1024 * 1024)
                  
                  speedData[loc.id] = {
                    rxMBps: Math.max(0, rxMBps),
                    txMBps: Math.max(0, txMBps),
                    timestamp: currentTime
                  }
                  writeSpeedData()
                }
              }
              
              lastRx = currentRx
              lastTx = currentTx
              lastTime = currentTime
            }
          }
        }).on('close', () => {
          console.log(`[REALTIME-SPEED] Stream closed on ${loc.name}`)
          conn.end()
          setTimeout(() => monitorLocation(loc), 5000)
        })
      })
    }).on('error', (err: Error) => {
      console.error(`[REALTIME-SPEED] SSH Error on ${loc.name}:`, err.message)
      setTimeout(() => monitorLocation(loc), 10000) // reconnect backoff
    }).connect({
      host: loc.host,
      port: 22,
      username: 'root',
      password: loc.sshPass,
      keepaliveInterval: 10000
    })
  })
}

async function main() {
  console.log('[REALTIME-SPEED] Starting real-time bandwidth monitor.')
  
  const locations = await prisma.location.findMany({
    where: { 
      isActive: true,
      sshPass: { not: null }
    }
  })

  if (locations.length === 0) {
    console.log('[REALTIME-SPEED] No active locations found. Exiting.')
    return
  }

  // Start monitoring all locations concurrently
  for (const loc of locations) {
    monitorLocation(loc)
  }
}

main().catch(console.error)
