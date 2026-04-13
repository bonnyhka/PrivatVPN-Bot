import { execSync, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import {
  PLAN_HEALTHCHECK_UUIDS,
  DEFAULT_REALITY_SNI,
  getPlanVlessPort,
  getPlanIdForVlessPort,
  normalizeManagedPlanId,
} from './vpn-protocols'
import { PrismaClient } from '@prisma/client'

function getRandomLocalPort() {
  return Math.floor(Math.random() * (40000 - 20000) + 20000)
}

function buildBaseConfig(localPort: number, outbound: any) {
  // CRITICAL FIX: Ensure server_port is a number for sing-box JSON
  if (outbound.server_port) {
    outbound.server_port = Number(outbound.server_port)
  }

  return {
    log: { level: 'warn' },
    inbounds: [
      {
        type: 'socks',
        listen: '127.0.0.1',
        listen_port: localPort,
      },
    ],
    outbounds: [
      outbound,
      {
        type: 'direct',
        tag: 'direct',
      },
    ],
    route: {
      auto_detect_interface: true,
    },
  }
}

async function runProbe(config: any, localPort: number): Promise<{ ok: boolean; latency: number; httpCode: number | null; error?: string }> {
  const tmpDir = fs.mkdtempSync(path.join('/tmp', 'privatvpn-smoke-'))
  const configPath = path.join(tmpDir, 'config.json')
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

  const child = spawn('/usr/bin/sing-box', ['run', '-c', configPath])

  return new Promise((resolve) => {
    let started = false
    let errorOutput = ''

    child.stderr.on('data', (data) => {
      const str = data.toString()
      errorOutput += str
      if (str.includes('started')) {
        started = true
      }
    })

    const timeout = setTimeout(() => {
      child.kill()
      resolve({
        ok: false,
        latency: 0,
        httpCode: null,
        error: started
          ? 'timeout'
          : `Local SOCKS port ${localPort} did not open in time | ${errorOutput.split('\n')[0]}`,
      })
    }, 10000)

    // Give sing-box a moment to start
    setTimeout(async () => {
      try {
        const start = Date.now()
        // Use curl as a probe since it's reliable and handles SOCKS5-hostname correctly
        const command = `curl --silent --show-error --output /dev/null --write-out %{http_code} --connect-timeout 5 --max-time 15 --socks5-hostname 127.0.0.1:${localPort} https://www.gstatic.com/generate_204`
        const httpCodeStr = execSync(command).toString().trim()
        const latency = Date.now() - start

        child.kill()
        clearTimeout(timeout)

        if (httpCodeStr === '204') {
          resolve({ ok: true, latency, httpCode: 204 })
        } else {
          const code = Number(httpCodeStr) || 0
          resolve({ ok: false, latency, httpCode: code, error: `HTTP ${httpCodeStr}` })
        }
      } catch (err: any) {
        child.kill()
        clearTimeout(timeout)
        resolve({ ok: false, latency: 0, httpCode: null, error: err.message })
      } finally {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true })
        } catch (e) {}
      }
    }, 2500)
  })
}

export async function probeVless(location: any, sampleVlessUuid: string, overridePort?: number) {
  const planId = getPlanIdForVlessPort(Number(overridePort || location.vlessPort || 12443))
  const uuid = sampleVlessUuid || PLAN_HEALTHCHECK_UUIDS[planId] || location.vlessUuid
  
  const localPort = getRandomLocalPort()
  const serverPort = Number(overridePort || location.vlessPort || getPlanVlessPort(planId))
  
  const config = buildBaseConfig(localPort, {
    type: 'vless',
    server: location.host,
    server_port: serverPort,
    uuid,
    tls: {
      enabled: true,
      server_name: location.vlessRealitySni || DEFAULT_REALITY_SNI,
      alpn: ['h2'],
      utls: {
        enabled: true,
        fingerprint: 'chrome',
      },
      reality: {
        enabled: true,
        public_key: location.vlessRealityPublicKey,
        short_id: location.vlessRealityShortId || '',
      },
    },
  })

  return runProbe(config, localPort)
}


export async function findSampleUsersByPlan(prisma: PrismaClient) {
  const plans = ['scout', 'guardian', 'fortress', 'citadel'] as const
  const results: Record<string, string> = {}

  for (const planId of plans) {
    const sub = await prisma.subscription.findFirst({
      where: { planId, status: 'active', expiresAt: { gt: new Date() } },
      select: { vlessUuid: true },
    })
    results[planId] = sub?.vlessUuid || (PLAN_HEALTHCHECK_UUIDS as any)[planId]
  }

  return results
}

export { getPlanVlessPort }
