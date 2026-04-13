import prisma from '@/lib/db'
import { Client } from 'ssh2'

type Candidate = {
  label: string
  host: string
  httpUrl?: string
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function runRemote(host: string, username: string, password: string, command: string) {
  return new Promise<string>((resolve, reject) => {
    const conn = new Client()
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end()
          reject(err)
          return
        }

        let output = ''
        let stderr = ''

        stream.on('data', (chunk: Buffer) => {
          output += chunk.toString()
        })

        stream.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString()
        })

        stream.on('close', () => {
          conn.end()
          resolve((output + stderr).trim())
        })
      })
    })

    conn.on('error', reject)

    conn.connect({
      host,
      port: 22,
      username,
      password,
      timeout: 20000,
    })
  })
}

async function main() {
  const locationId = requireEnv('LOCATION_ID')
  const targets = JSON.parse(requireEnv('TARGETS_JSON')) as Candidate[]
  const iperfParallel = Number(process.env.IPERF_PARALLEL || '4')
  const iperfDuration = Number(process.env.IPERF_DURATION || '5')
  const httpMaxTime = Number(process.env.HTTP_MAX_TIME || '25')

  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error('TARGETS_JSON must be a non-empty JSON array')
  }

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      name: true,
      host: true,
      sshUser: true,
      sshPass: true,
    },
  })

  if (!location?.sshPass) {
    throw new Error(`Location ${locationId} is missing SSH credentials`)
  }

  const encodedTargets = Buffer.from(JSON.stringify(targets), 'utf8').toString('base64')

  const remoteScript = `python3 - <<'PY'
import base64, json, re, subprocess

candidates = json.loads(base64.b64decode(${JSON.stringify(encodedTargets)}).decode('utf-8'))

def run(cmd, timeout=20):
    try:
        return subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, text=True, timeout=timeout)
    except subprocess.CalledProcessError as error:
        return error.output
    except Exception as error:
        return "ERROR: " + str(error)

def parse_ping(output):
    packet_loss = None
    avg_ms = None
    loss_match = re.search(r'(\\d+(?:\\.\\d+)?)% packet loss', output)
    if loss_match:
        packet_loss = float(loss_match.group(1))
    rtt_match = re.search(r'=\\s*([0-9.]+)/([0-9.]+)/([0-9.]+)/([0-9.]+) ms', output)
    if rtt_match:
        avg_ms = float(rtt_match.group(2))
    return {
        "lossPct": packet_loss,
        "avgMs": avg_ms,
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

def parse_http_download(output):
    try:
        speed_bytes = float((output or '').strip().splitlines()[-1])
        return {
            "mbps": round((speed_bytes * 8) / 1000000, 1)
        }
    except Exception:
        return {
            "mbps": None
        }

results = []

for candidate in candidates:
    host = candidate["host"]
    http_url = candidate.get("httpUrl")
    results.append({
        "label": candidate["label"],
        "host": host,
        "ping": parse_ping(run(f"ping -c 6 {host}", timeout=12)),
        "mtr": parse_mtr(run(f"mtr -rwzc 10 {host}", timeout=45)),
        "iperfUp": parse_iperf(run(f"iperf3 -4 -c {host} -p 5201 -P ${iperfParallel} -t ${iperfDuration} -J", timeout=max(25, ${iperfDuration} + 20))),
        "iperfDown": parse_iperf(run(f"iperf3 -4 -c {host} -p 5201 -P ${iperfParallel} -t ${iperfDuration} -J -R", timeout=max(25, ${iperfDuration} + 20))),
        "httpDownload": parse_http_download(
            run(
                f"curl -L --output /dev/null --silent --show-error --max-time ${httpMaxTime} --write-out '%{{speed_download}}' {http_url}",
                timeout=${httpMaxTime} + 10
            )
        ) if http_url else None,
    })

print(json.dumps({
    "location": {
        "id": ${JSON.stringify(location.id)},
        "name": ${JSON.stringify(location.name)},
        "host": ${JSON.stringify(location.host)},
    },
    "results": results,
}, ensure_ascii=False))
PY`

  const output = await runRemote(
    location.host,
    location.sshUser || 'root',
    location.sshPass,
    remoteScript
  )

  console.log(output)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
