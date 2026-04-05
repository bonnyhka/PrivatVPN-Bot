import prisma from '@/lib/db'
import { Client } from 'ssh2'

async function rescueServer(loc: any, subscriptions: any[]) {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('ready', () => {
      console.log(`Rescuing ${loc.name} (${loc.host})...`)
      
      // 1. Generate new keys
      conn.exec('/usr/local/bin/xray x25519', (err, stream) => {
        let output = ''
        stream.on('data', d => output += d.toString()).on('close', async () => {
          const lines = output.trim().split('\n')
          let privateKey = ''
          let publicKey = ''
          for (const line of lines) {
            if (line.includes('PrivateKey:')) privateKey = line.split('PrivateKey:')[1].trim()
            if (line.includes('PublicKey:')) publicKey = line.split('PublicKey:')[1].trim()
            if (line.includes('Password:')) publicKey = line.split('Password:')[1].trim()
          }

          if (!privateKey || !publicKey) {
            console.error(`Failed to generate keys for ${loc.host}`)
            conn.end()
            return resolve(false)
          }

          console.log(`New Keys for ${loc.name}: Pub=${publicKey}`)

          // 2. Build clients
          const vlessClients = subscriptions.map(sub => ({
            id: sub.vlessUuid,
            email: sub.id,
            level: sub.planId === 'scout' ? 1 : sub.planId === 'guardian' ? 2 : 3
          }))

          const ssClients = subscriptions.map(sub => ({
            password: sub.vlessUuid,
            email: sub.id,
            method: 'chacha20-ietf-poly1305'
          }))

          const xrayConfig = {
            'log': { 'loglevel': 'none' },
            'inbounds': [
              {
                'port': 443,
                'protocol': 'vless',
                'settings': {
                  'clients': vlessClients,
                  'decryption': 'none'
                },
                'streamSettings': {
                  'network': 'tcp',
                  'security': 'reality',
                  'realitySettings': {
                    'show': false,
                    'dest': `${loc.vlessRealitySni || 'www.microsoft.com'}:443`,
                    'xver': 0,
                    'serverNames': [loc.vlessRealitySni || 'www.microsoft.com'],
                    'privateKey': privateKey,
                    'shortIds': [loc.vlessRealityShortId || '8e70f204859bc060']
                  }
                }
              },
              {
                'port': 8443,
                'protocol': 'shadowsocks',
                'settings': {
                  'clients': ssClients,
                  'network': 'tcp,udp'
                }
              }
            ],
            'outbounds': [{ 'protocol': 'freedom' }],
            'policy': {
              'levels': {
                '1': { 'handshake': 4, 'connIdle': 120, 'bufferSize': 32 },
                '2': { 'handshake': 4, 'connIdle': 300, 'bufferSize': 64 },
                '3': { 'handshake': 4, 'connIdle': 600, 'bufferSize': 128 }
              }
            }
          }

          const configCmd = `echo '${JSON.stringify(xrayConfig)}' > /usr/local/etc/xray/config.json && systemctl restart xray`
          conn.exec(configCmd, (err2, stream2) => {
            stream2.on('data', d2 => process.stdout.write(d2)).on('close', async () => {
              // 3. Update DB
              await prisma.location.update({
                where: { id: loc.id },
                data: {
                  vlessRealityPublicKey: publicKey,
                  vlessRealityPrivateKey: privateKey
                }
              })
              console.log(`Rescued ${loc.name}`)
              conn.end()
              resolve(true)
            })
          })
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
  const subscriptions = await prisma.subscription.findMany({ where: { status: 'active' } })
  const locations = await prisma.location.findMany({ where: { isActive: true, sshPass: { not: null } } })

  for (const loc of locations) {
    await rescueServer(loc, subscriptions)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
