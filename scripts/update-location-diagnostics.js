const fs = require('fs')
const net = require('net')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { Client } = require('ssh2')

const prisma = new PrismaClient()
const OUTPUT_FILE = path.resolve(__dirname, '..', 'data', 'location-diagnostics.json')
const INTERVAL_MS = 20 * 60 * 1000
const NETWORK_HISTORY_LIMIT = 72

const GERMANY_TARGET = {
  host: 'fra.speedtest.clouvider.net',
  label: 'Frankfurt (Clouvider)',
}

const NETHERLANDS_TARGET = {
  host: 'iperf-ams.vsys.host',
  label: 'Amsterdam',
}

const TARGETS = {
  netherlands1: NETHERLANDS_TARGET,
  germany1: GERMANY_TARGET,
  uk1: GERMANY_TARGET,
}

const TARGETS_BY_HOST = {
  '45.84.222.96': NETHERLANDS_TARGET,
  '144.31.220.23': GERMANY_TARGET,
}

function getTargetForLocation(location) {
  return (
    TARGETS[location.id] ||
    TARGETS_BY_HOST[location.host] ||
    GERMANY_TARGET
  )
}

function ensureOutputDir() {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
}

function readPreviousSnapshots() {
  try {
    const raw = fs.readFileSync(OUTPUT_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

function getPortsToCheck(locationId) {
  return [
    { key: 'vless', port: 12443, label: 'VLESS' },
    { key: 'ss', port: 15113, label: 'SS' },
    { key: 'fortress', port: 10443, label: 'Fortress' },
    { key: 'guardian', port: 11443, label: 'Guardian' },
    { key: 'scout', port: 9443, label: 'Scout' },
    { key: 'vless8443', port: 8443, label: 'VLESS Alt' },
  ]
}

function checkPort(host, port, timeout = 1800) {
  const start = Date.now()
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const timer = setTimeout(() => {
      socket.destroy()
      resolve({ isUp: false, latency: 0 })
    }, timeout)

    socket.connect(port, host, () => {
      clearTimeout(timer)
      const latency = Date.now() - start
      socket.destroy()
      resolve({ isUp: true, latency })
    })

    socket.on('error', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve({ isUp: false, latency: 0 })
    })
  })
}

async function runPortChecks(location) {
  const ports = getPortsToCheck(location.id)
  return Promise.all(
    ports.map(async ({ key, port, label }) => ({
      key,
      port,
      label,
      ...(await checkPort(location.host, port)),
    }))
  )
}

function buildRemoteScript(targetHost, targetLabel) {
  return `python3 - <<'PY'
import json, re, subprocess, time

TARGET_HOST = ${JSON.stringify(targetHost)}
TARGET_LABEL = ${JSON.stringify(targetLabel)}

def run(command, timeout=25):
    try:
        return subprocess.check_output(command, shell=True, stderr=subprocess.STDOUT, text=True, timeout=timeout)
    except subprocess.CalledProcessError as error:
        return error.output
    except Exception as error:
        return "ERROR: " + str(error)

def ensure_binary(binary, package_name):
    check = subprocess.call(f"command -v {binary} >/dev/null 2>&1", shell=True)
    if check == 0:
        return
    subprocess.call(
        f"DEBIAN_FRONTEND=noninteractive apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq {package_name}",
        shell=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

def parse_ping(output):
    packet_loss = None
    avg_ms = None
    max_ms = None
    loss_match = re.search(r'(\\d+(?:\\.\\d+)?)% packet loss', output)
    if loss_match:
        packet_loss = float(loss_match.group(1))
    rtt_match = re.search(r'=\\s*([0-9.]+)/([0-9.]+)/([0-9.]+)/([0-9.]+) ms', output)
    if rtt_match:
        avg_ms = float(rtt_match.group(2))
        max_ms = float(rtt_match.group(3))
    return {
        "lossPct": packet_loss,
        "avgMs": avg_ms,
        "maxMs": max_ms,
    }

def parse_iperf(output):
    try:
        data = json.loads(output)
        end = data.get("end", {})
        sent = end.get("sum_sent", {}) or {}
        received = end.get("sum_received", {}) or {}
        sender_bps = sent.get("bits_per_second")
        receiver_bps = received.get("bits_per_second")
        retransmits = sent.get("retransmits")
        return {
            "senderMbps": round(sender_bps / 1000000, 1) if sender_bps is not None else None,
            "receiverMbps": round(receiver_bps / 1000000, 1) if receiver_bps is not None else None,
            "retransmits": retransmits if retransmits is not None else None,
        }
    except Exception:
        return {
            "senderMbps": None,
            "receiverMbps": None,
            "retransmits": None,
        }

def parse_mtr(output):
    rows = [line.strip() for line in output.splitlines() if line.strip()]
    if len(rows) < 2:
        return {"lossPct": None, "avgMs": None, "worstMs": None, "host": None}
    last = rows[-1]
    match = re.search(
        r'^\\d+\\.\\s+(?:AS\\S+\\s+)?(\\S+)\\s+(\\d+(?:\\.\\d+)?%)\\s+\\d+\\s+([0-9.]+)\\s+([0-9.]+)\\s+([0-9.]+)\\s+([0-9.]+)',
        last
    )
    if not match:
        return {"lossPct": None, "avgMs": None, "worstMs": None, "host": None}
    try:
        return {
            "host": match.group(1),
            "lossPct": float(match.group(2).replace('%', '')),
            "avgMs": float(match.group(4)),
            "worstMs": float(match.group(6)),
        }
    except Exception:
        return {"lossPct": None, "avgMs": None, "worstMs": None, "host": None}

def parse_tc_bytes(output, prefix):
    total = 0
    current_class = None
    for line in output.splitlines():
        class_match = re.search(r'class htb ' + prefix + r':(10|20|30|40)\\b', line)
        if class_match:
            current_class = class_match.group(1)
            continue
        if current_class:
            sent_match = re.search(r'Sent\\s+(\\d+)\\s+bytes', line)
            if sent_match:
                total += int(sent_match.group(1))
                current_class = None
    return total

def get_vpn_traffic():
    iface_output = run("ip route show default | awk '/default/ {print $5; exit}'", timeout=5).strip().splitlines()
    iface = iface_output[0] if iface_output else "eth0"
    egress_output = run(f"tc -s class show dev {iface}", timeout=10)
    ingress_output = run("tc -s class show dev ifb0", timeout=10)
    egress_bytes = parse_tc_bytes(egress_output, "1")
    ingress_bytes = parse_tc_bytes(ingress_output, "2")
    return {
        "egressBytes": egress_bytes,
        "ingressBytes": ingress_bytes,
        "totalCounterBytes": egress_bytes + ingress_bytes,
    }

payload = {
    "checkedAt": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    "targetHost": TARGET_HOST,
    "targetLabel": TARGET_LABEL,
    "rawStatus": "ok",
    "error": None,
}

try:
    ensure_binary("iperf3", "iperf3")
    ensure_binary("mtr", "mtr-tiny")
    payload["pingTarget"] = parse_ping(run(f"ping -c 6 {TARGET_HOST}", timeout=12))
    payload["iperf"] = parse_iperf(run(f"iperf3 -4 -c {TARGET_HOST} -p 5201 -P 4 -t 5 -J", timeout=20))
    payload["mtr"] = parse_mtr(run(f"mtr -rwzc 10 {TARGET_HOST}", timeout=45))
    payload["vpnTraffic"] = get_vpn_traffic()
except Exception as error:
    payload["rawStatus"] = "error"
    payload["error"] = str(error)

print(json.dumps(payload))
PY`
}

function runDiagnostic(location, target = getTargetForLocation(location)) {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('ready', () => {
      conn.exec(buildRemoteScript(target.host, target.label), (err, stream) => {
        if (err) {
          conn.end()
          return resolve({
            checkedAt: new Date().toISOString(),
            targetHost: target.host,
            targetLabel: target.label,
            rawStatus: 'error',
            error: err.message,
          })
        }

        let output = ''
        stream.on('data', (chunk) => {
          output += chunk.toString()
        })
        stream.stderr.on('data', (chunk) => {
          output += chunk.toString()
        })
        stream.on('close', () => {
          conn.end()
          try {
            const parsed = JSON.parse(output.trim())
            resolve(parsed)
          } catch (error) {
            resolve({
              checkedAt: new Date().toISOString(),
              targetHost: target.host,
              targetLabel: target.label,
              rawStatus: 'error',
              error: 'parse error: ' + error.message,
            })
          }
        })
      })
    })
    conn.on('error', (error) => {
      resolve({
        checkedAt: new Date().toISOString(),
        targetHost: target.host,
        targetLabel: target.label,
        rawStatus: 'error',
        error: error.message,
      })
    })

    conn.connect({
      host: location.host,
      port: 22,
      username: location.sshUser || 'root',
      password: location.sshPass,
      timeout: 20000,
    })
  })
}

async function updateOnce() {
  const previousCache = readPreviousSnapshots()
  const previousLocations = previousCache.locations || {}
  const locations = await prisma.location.findMany({
    where: {
      isActive: true,
      sshUser: { not: null },
      sshPass: { not: null },
    },
    select: {
      id: true,
      host: true,
      sshUser: true,
      sshPass: true,
    },
  })

  const snapshots = {}

  for (const location of locations) {
    try {
      const enforcedTarget = getTargetForLocation(location)
      console.log(
        `[diagnostics] checking ${location.id} (${location.host}) -> ${enforcedTarget.label} ${enforcedTarget.host}`
      )
      const [snapshot, checks] = await Promise.all([
        runDiagnostic(location, enforcedTarget),
        runPortChecks(location),
      ])
      snapshot.targetHost = enforcedTarget.host
      snapshot.targetLabel = enforcedTarget.label
      const previous = previousLocations[location.id] || {}
      const currentDay = new Date().toISOString().slice(0, 10)
      const currentTraffic = Number(snapshot?.vpnTraffic?.totalCounterBytes || 0)
      const previousTraffic = Number(previous?.vpnTraffic?.totalCounterBytes || 0)
      const previousDay = previous?.vpnTraffic?.day || currentDay
      const previousToday = Number(previous?.vpnTraffic?.todayBytes || 0)
      const checkedAt = snapshot.checkedAt || new Date().toISOString()
      const hourBucket = `${checkedAt.slice(0, 13)}:00:00Z`

      let deltaBytes = 0
      let todayBytes = previousDay === currentDay ? previousToday : 0

      if (currentTraffic > 0 && previousTraffic > 0) {
        deltaBytes = currentTraffic >= previousTraffic ? currentTraffic - previousTraffic : currentTraffic
        todayBytes += deltaBytes
      }

      if ((!snapshot?.iperf?.senderMbps || !snapshot?.iperf?.receiverMbps) && previous?.iperf) {
        snapshot.iperf = previous.iperf
      }

      if (
        (!snapshot?.mtr?.avgMs || !snapshot?.mtr?.worstMs) &&
        previous?.mtr &&
        previous?.targetHost === snapshot?.targetHost
      ) {
        snapshot.mtr = previous.mtr
      }

      // Some nodes can lose the ICMP ping result (or SSH auth issues can prevent it),
      // while MTR still contains a stable latency/loss signal. Use it as a fallback
      // so UI and history always have "ping" for the node.
      if (
        (!snapshot?.pingTarget?.avgMs && !snapshot?.pingTarget?.maxMs && !snapshot?.pingTarget?.lossPct) &&
        snapshot?.mtr &&
        (snapshot.mtr.avgMs || snapshot.mtr.worstMs || snapshot.mtr.lossPct)
      ) {
        snapshot.pingTarget = {
          lossPct: snapshot.mtr.lossPct ?? null,
          avgMs: snapshot.mtr.avgMs ?? null,
          maxMs: snapshot.mtr.worstMs ?? null,
        }
      }

      if (snapshot?.vpnTraffic) {
        const previousHistory = Array.isArray(previous?.vpnTraffic?.history) ? previous.vpnTraffic.history : []
        const sanitizedHistory = previousHistory.filter((entry) => entry && entry.timestamp)
        const lastEntry = sanitizedHistory[sanitizedHistory.length - 1]

        let nextHistory
        if (lastEntry && lastEntry.timestamp === hourBucket) {
          nextHistory = [
            ...sanitizedHistory.slice(0, -1),
            {
              ...lastEntry,
              bytes: Number(lastEntry.bytes || 0) + deltaBytes,
              totalBytes: todayBytes,
            },
          ]
        } else {
          nextHistory = [
            ...sanitizedHistory,
            {
              timestamp: hourBucket,
              bytes: deltaBytes,
              totalBytes: todayBytes,
            },
          ]
        }

        nextHistory = nextHistory.slice(-24)

        snapshot.vpnTraffic.deltaBytes = deltaBytes
        snapshot.vpnTraffic.todayBytes = todayBytes
        snapshot.vpnTraffic.day = currentDay
        snapshot.vpnTraffic.history = nextHistory
      }

      const previousNetworkHistory = Array.isArray(previous?.networkHistory)
        ? previous.networkHistory.filter((entry) => entry && entry.timestamp)
        : []
      const seedPreviousNetworkHistory =
        previousNetworkHistory.length === 0 &&
        previous?.checkedAt &&
        (previous?.iperf || previous?.pingTarget || previous?.mtr)
          ? [{
            timestamp: previous.checkedAt,
            pingTargetAvgMs: previous?.pingTarget?.avgMs ?? null,
            packetLossPct: previous?.pingTarget?.lossPct ?? null,
            iperfSenderMbps: previous?.iperf?.senderMbps ?? null,
            iperfReceiverMbps: previous?.iperf?.receiverMbps ?? null,
            retransmits: previous?.iperf?.retransmits ?? null,
            mtrAvgMs: previous?.mtr?.avgMs ?? null,
            mtrWorstMs: previous?.mtr?.worstMs ?? null,
            mtrLossPct: previous?.mtr?.lossPct ?? null,
          }]
          : previousNetworkHistory

      const nextNetworkHistory = [
        ...seedPreviousNetworkHistory,
        {
          timestamp: checkedAt,
          pingTargetAvgMs: snapshot?.pingTarget?.avgMs ?? null,
          packetLossPct: snapshot?.pingTarget?.lossPct ?? null,
          iperfSenderMbps: snapshot?.iperf?.senderMbps ?? null,
          iperfReceiverMbps: snapshot?.iperf?.receiverMbps ?? null,
          retransmits: snapshot?.iperf?.retransmits ?? null,
          mtrAvgMs: snapshot?.mtr?.avgMs ?? null,
          mtrWorstMs: snapshot?.mtr?.worstMs ?? null,
          mtrLossPct: snapshot?.mtr?.lossPct ?? null,
        },
      ]
        .filter((entry, index, array) => entry?.timestamp && array.findIndex((candidate) => candidate.timestamp === entry.timestamp) === index)
        .slice(-NETWORK_HISTORY_LIMIT)

      snapshot.networkHistory = nextNetworkHistory

      snapshot.checks = checks
      snapshot.onlinePorts = checks.filter((check) => check.isUp).length
      snapshot.totalPorts = checks.length
      snapshot.isActive = snapshot.onlinePorts > 0

      snapshots[location.id] = snapshot
    } catch (error) {
      snapshots[location.id] = {
        checkedAt: new Date().toISOString(),
        rawStatus: 'error',
        error: error.message,
      }
    }
  }

  for (const location of locations) {
    const snapshot = snapshots[location.id]
    if (!snapshot) continue
    const enforcedTarget = getTargetForLocation(location)
    snapshot.targetHost = enforcedTarget.host
    snapshot.targetLabel = enforcedTarget.label
  }

  ensureOutputDir()
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        locations: snapshots,
      },
      null,
      2
    )
  )

  console.log(`[diagnostics] snapshot saved to ${OUTPUT_FILE}`)
}

async function main() {
  const once = process.argv.includes('--once')

  if (once) {
    await updateOnce()
    await prisma.$disconnect()
    return
  }

  while (true) {
    try {
      await updateOnce()
    } catch (error) {
      console.error('[diagnostics] fatal cycle error:', error)
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS))
  }
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
