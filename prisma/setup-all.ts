import prisma from '@/lib/db'
import { Client } from 'ssh2'
import crypto from 'crypto'
import { createStrongPassword } from '../lib/security'

async function setupServer(host: string, pass: string, name: string, dest: string, serverNames: string[], shortId: string) {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('ready', () => {
      console.log(`Connected to ${name} (${host})`)
      
      const installCmd = `
        /usr/local/bin/xray x25519
      `
      
      conn.exec(installCmd, (err, stream) => {
        let output = ''
        stream.on('data', d => output += d.toString()).on('close', () => {
          const lines = output.trim().split('\n')
          let privateKey = ''
          let publicKey = ''
          for (const line of lines) {
            if (line.includes('PrivateKey:')) privateKey = line.split('PrivateKey:')[1].trim()
            if (line.includes('PublicKey:')) publicKey = line.split('PublicKey:')[1].trim()
            if (line.includes('Password:')) publicKey = line.split('Password:')[1].trim()
          }

          const bootstrapUuid = crypto.randomUUID()
          const bootstrapSsPassword = createStrongPassword(28)

          const xrayConfig = {
            'log': { 'loglevel': 'none' }, // ZERO LOGS promise
            'inbounds': [
              {
                'port': 443,
                'protocol': 'vless',
                'settings': {
                  'clients': [{ 'id': bootstrapUuid, 'level': 0 }],
                  'decryption': 'none'
                },
                'streamSettings': {
                  'network': 'tcp',
                  'security': 'reality',
                  'realitySettings': {
                    'show': false,
                    'dest': `${dest}:443`,
                    'xver': 0,
                    'serverNames': serverNames,
                    'privateKey': privateKey,
                    'shortIds': [shortId]
                  }
                }
              },
              {
                'port': 8443,
                'protocol': 'shadowsocks',
                'settings': {
                  'clients': [{ 'password': bootstrapSsPassword, 'method': 'chacha20-ietf-poly1305' }],
                  'network': 'tcp,udp'
                }
              }
            ],
            'outbounds': [{ 'protocol': 'freedom' }],
            'policy': {
              'levels': {
                '0': {
                  'handshake': 4,
                  'connIdle': 300,
                  'uplinkOnly': 2,
                  'downlinkOnly': 5,
                  'bufferSize': 64 // Smaller buffer can help with speed limit feel but not real limit
                }
              }
            }
          }

          const configCmd = `echo '${JSON.stringify(xrayConfig)}' > /usr/local/etc/xray/config.json && systemctl restart xray`
          conn.exec(configCmd, (err2, stream2) => {
            stream2.on('data', d2 => process.stdout.write(d2)).on('close', async () => {
              // Update DB
              const id = name.toLowerCase().replace(' #', '')
              await prisma.location.update({
                where: { id: id.includes('germany') ? 'germany1' : 'netherlands1' },
                data: {
                  vlessRealityPublicKey: publicKey,
                  vlessRealitySni: dest,
                  vlessRealityShortId: shortId
                }
              })
              console.log(`Updated ${name} in DB`)
              conn.end()
              resolve(true)
            })
          })
        })
      })
    }).connect({ host, port: 22, username: 'root', password: pass })
  })
}

async function main() {
  const sshPassword = process.env.VPN_NODE_PASSWORD || ''
  if (!sshPassword) {
    throw new Error('VPN_NODE_PASSWORD environment variable is required for setup-all.ts')
  }

  await setupServer('94.156.179.93', sshPassword, 'Germany #1', 'www.microsoft.com', ['www.microsoft.com', 'microsoft.com'], '8e70f204859bc060')
  await setupServer('45.84.222.96', sshPassword, 'Netherlands #1', 'dl.google.com', ['dl.google.com', 'google.com'], '9f10e304859bc070')
}

main().catch(console.error)
