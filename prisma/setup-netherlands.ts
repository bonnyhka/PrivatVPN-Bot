import prisma from '@/lib/db'
import { Client } from 'ssh2'
import crypto from 'crypto'
import { createStrongPassword } from '../lib/security'
const host = '45.84.222.96'
const pass = process.env.VPN_NODE_PASSWORD || ''

async function setup() {
  if (!pass) {
    throw new Error('VPN_NODE_PASSWORD environment variable is required for setup-netherlands.ts')
  }

  const conn = new Client()
  conn.on('ready', () => {
    console.log('Client :: ready')
    
    // 1. Install Xray and get Keys
    const installCmd = `
      apt-get update && apt-get install -y curl &&
      bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install -u root &&
      /usr/local/bin/xray x25519
    `
    
    conn.exec(installCmd, (err, stream) => {
      let output = ''
      stream.on('data', d => output += d.toString()).on('close', async () => {
        console.log('Installation output:', output)
        
        const lines = output.trim().split('\n')
        let privateKey = ''
        let publicKey = ''
        
        for (const line of lines) {
          if (line.includes('PrivateKey:')) privateKey = line.split('PrivateKey:')[1].trim()
          if (line.includes('PublicKey:')) publicKey = line.split('PublicKey:')[1].trim()
          // Some versions output "Password:" as the public key in some parsers, 
          // but x25519 usually outputs PrivateKey and PublicKey labels.
          if (line.includes('Password:')) publicKey = line.split('Password:')[1].trim()
        }

        if (!privateKey || !publicKey) {
          console.error('Failed to get keys!')
          conn.end()
          return
        }

        console.log('Keys generated:', { privateKey, publicKey })

        // 2. Configure Xray
        const bootstrapUuid = crypto.randomUUID()
        const bootstrapSsPassword = createStrongPassword(28)

        const xrayConfig = {
          'log': { 'loglevel': 'warning' },
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
                  'dest': 'dl.google.com:443',
                  'xver': 0,
                  'serverNames': ['dl.google.com', 'google.com'],
                  'privateKey': privateKey,
                  'shortIds': ['9f10e304859bc070']
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
          'outbounds': [{ 'protocol': 'freedom' }]
        }

        const configCmd = `echo '${JSON.stringify(xrayConfig)}' > /usr/local/etc/xray/config.json && systemctl restart xray && systemctl status xray --no-pager`
        
        conn.exec(configCmd, (err2, stream2) => {
          stream2.on('data', d2 => process.stdout.write(d2)).on('close', async () => {
            console.log('Xray configured!')
            
            // 3. Update DB
            await prisma.location.upsert({
              where: { id: 'netherlands1' },
              update: {
                host: host,
                name: 'Netherlands #1',
                country: 'Netherlands',
                flag: '🇳🇱',
                isActive: true,
                sshUser: 'root',
                sshPass: pass,
                vlessUuid: bootstrapUuid,
                vlessPort: 443,
                vlessReality: true,
                vlessRealityPublicKey: publicKey,
                vlessRealitySni: 'dl.google.com',
                vlessRealityShortId: '9f10e304859bc070',
                ssPort: 8443,
                ssPassword: bootstrapSsPassword
              },
              create: {
                id: 'netherlands1',
                host: host,
                name: 'Netherlands #1',
                country: 'Netherlands',
                flag: '🇳🇱',
                isActive: true,
                sshUser: 'root',
                sshPass: pass,
                vlessUuid: bootstrapUuid,
                vlessPort: 443,
                vlessReality: true,
                vlessRealityPublicKey: publicKey,
                vlessRealitySni: 'dl.google.com',
                vlessRealityShortId: '9f10e304859bc070',
                ssPort: 8443,
                ssPassword: bootstrapSsPassword
              } as any
            })
            
            console.log('Database updated for Netherlands #1')
            conn.end()
            process.exit(0)
          })
        })
      })
    })
  }).connect({
    host: host,
    port: 22,
    username: 'root',
    password: pass
  })
}

setup().catch(console.error)
