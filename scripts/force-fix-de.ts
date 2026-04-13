import { PrismaClient } from '@prisma/client'
import { Client } from 'ssh2'

const prisma = new PrismaClient()

async function main() {
  const loc = await prisma.location.findUnique({ where: { id: 'germany1' } })
  if (!loc) throw new Error('Germany node not found')

  const activeSubs = await prisma.subscription.findMany({
    where: { status: 'active' },
    select: { vlessUuid: true }
  })

  const baseUsers = (activeSubs || [])
    .filter(s => s.vlessUuid)
    .map(s => ({ name: s.vlessUuid, uuid: s.vlessUuid }))
  
  console.log(`[FORCE-FIX] Found ${baseUsers.length} active users.`)
  if (baseUsers.length === 0) {
    baseUsers.push({ name: 'emergency-test', uuid: '1cf2d372-bd4e-4cd2-aec2-7bdf1aba5e4e' })
  }

  // Use ONLY 443 for first test
  const vlessPorts = [443]
  
  const config = {
    'log': { 'level': 'info', 'timestamp': true },
    'dns': { 'servers': [{ 'tag': 'google', 'address': '8.8.8.8' }] },
    'inbounds': vlessPorts.map(port => ({
      'type': 'vless',
      'tag': `vless-in-${port}`,
      'listen': '0.0.0.0',
      'listen_port': port,
      'sniff': true,
      'users': baseUsers,
      'tls': {
        'enabled': true,
        'server_name': loc.vlessRealitySni || 'dl.google.com',
        'reality': {
          'enabled': true,
          'handshake': { 'server': loc.vlessRealitySni || 'dl.google.com', 'server_port': 443 },
          'private_key': loc.vlessRealityPrivateKey || '',
          'short_id': [loc.vlessRealityShortId || '8e70f204859bc060']
        }
      }
    })),
    'outbounds': [{ 'type': 'direct', 'tag': 'direct' }],
    'route': { 'final': 'direct' }
  }

  const configBase64 = Buffer.from(JSON.stringify(config, null, 2)).toString('base64')

  const script = `#!/bin/bash
echo "--> ULTIMATE DIAGNOSTIC FIX FOR ${loc.name}..."
echo "1. Checking ports..."
netstat -tulpn | grep -E "80|443|543|8443" || echo "Ports seem free."

echo "2. Checking Sing-box version..."
sing-box version || echo "Sing-box not found in PATH."

echo "3. Cleaning up..."
systemctl stop sing-box 2>/dev/null || true
pkill -9 sing-box 2>/dev/null || true

echo "4. Applying config..."
mkdir -p /etc/sing-box
echo "${configBase64}" | base64 -d > /etc/sing-box/config.json

echo "5. Testing config..."
sing-box check -c /etc/sing-box/config.json

echo "6. Starting service..."
systemctl start sing-box
sleep 2
systemctl status sing-box --no-pager
`

  console.log(`[FORCE-FIX] Connecting to ${loc.host}...`)
  const conn = new Client()
  conn.on('ready', () => {
    conn.exec(script, (err, stream) => {
      if (err) throw err
      stream.on('data', (d) => console.log(d.toString()))
      stream.on('stderr', (d) => console.error('[STDERR] ' + d.toString()))
      stream.on('close', () => {
        conn.end()
        process.exit(0)
      })
    })
  }).connect({
    host: loc.host,
    username: 'root',
    password: loc.sshPass
  })
}

main().catch(console.error)
