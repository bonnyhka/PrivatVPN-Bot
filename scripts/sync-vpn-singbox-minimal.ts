import prisma from '@/lib/db'
import { Client } from 'ssh2'

async function syncAll(loc: any, subscriptions: any[]) {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('error', (err) => {
      console.error(`SSH Connection Error for ${loc.name}:`, err.message)
      resolve(false)
    })
    conn.on('ready', () => {
      console.log(`Syncing Minimal Sing-box to ${loc.name} (${loc.host})...`)
      
      const vlessUsers = subscriptions.map(sub => ({
        uuid: sub.vlessUuid,
        name: sub.id,
        flow: 'xtls-rprx-vision'
      }))

      const vlessPorts = [80, 443, 448, 8443, 9443, 10443, 11443, 12443]
      const singboxConfig = {
        'log': { 'level': 'info', 'timestamp': true },
        'dns': {
          'servers': [
            { 'tag': 'google', 'address': '8.8.8.8', 'detour': 'direct' },
            { 'tag': 'cloudflare', 'address': '1.1.1.1', 'detour': 'direct' },
            { 'tag': 'local', 'address': 'local', 'detour': 'direct' }
          ],
          'rules': [
            { 'protocol': 'dns', 'server': 'google' },
            { 'geosite': ['category-ads-all'], 'server': 'block' }
          ],
          'final': 'google',
          'strategy': 'ipv4_only'
        },
        'inbounds': [
          ...vlessPorts.map(port => ({
            'type': 'vless',
            'tag': `vless-in-${port}`,
            'listen': '::',
            'listen_port': port,
            'sniff': true,
            'sniff_override_destination': true,
            'users': vlessUsers,
            'tls': {
              'enabled': true,
              'server_name': loc.vlessRealitySni || 'www.microsoft.com',
              'reality': {
                'enabled': true,
                'handshake': { 'server': loc.vlessRealitySni || 'www.microsoft.com', 'server_port': 443 },
                'private_key': loc.vlessRealityPrivateKey,
                'short_id': [loc.vlessRealityShortId || '8e70f204859bc060']
              }
            },
            'multiplex': {
              'enabled': true
            }
          })),
          {
            'type': 'shadowsocks',
            'tag': 'ss-in-15113',
            'listen': '::',
            'listen_port': 15113,
            'method': 'chacha20-ietf-poly1305',
            'users': vlessUsers.map(u => ({ 'name': u.name, 'password': u.uuid })),
            'multiplex': {
              'enabled': true
            }
          },
          {
            'type': 'hysteria2',
            'tag': 'hy2-in-443',
            'listen': '::',
            'listen_port': 443,
            'users': vlessUsers.map(u => ({ 'name': u.name, 'password': u.uuid })),
            'tls': {
              'enabled': true,
              'certificate_path': '/etc/sing-box/cert.pem',
              'key_path': '/etc/sing-box/key.pem'
            }
          }
        ],
        'outbounds': [
          { 'type': 'direct', 'tag': 'direct' },
          { 'type': 'block', 'tag': 'block' },
          { 'type': 'dns', 'tag': 'dns-out' }
        ],
        'experimental': {
          'clash_api': {
            'external_controller': '127.0.0.1:9090',
            'secret': ''
          },
          'v2ray_api': {
            'listen': '127.0.0.1:10086',
            'stats': {
              'enabled': true,
              'inbounds': vlessPorts.map(p => `vless-in-${p}`).concat(['ss-in-15113']),
              'outbounds': ['direct', 'block'],
              'users': vlessUsers.map(u => u.name)
            }
          }
        },
        'route': {
          'rules': [
            { 'protocol': 'dns', 'outbound': 'dns-out' },
            { 'geosite': ['category-ads-all'], 'outbound': 'block' }
          ],
          'final': 'direct'
        }
      }

      const configCmd = `
        export DEBIAN_FRONTEND=noninteractive
        echo "--> [1/5] Configuring network (BBR & MSS)..."
        if ! grep -q "net.core.default_qdisc=fq" /etc/sysctl.conf; then
          echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
          echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
          sysctl -p
        fi

        iptables -t mangle -D POSTROUTING -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1350 2>/dev/null || true
        iptables -t mangle -A POSTROUTING -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1350

        echo "--> [2/5] Checking dependencies (curl, sing-box)..."
        if ! command -v curl &> /dev/null; then
          echo "Installing curl..."
          apt-get update -y && apt-get install -y curl
        fi

        if ! command -v sing-box &> /dev/null; then
          echo "Sing-box not found. Installing..."
          bash <(curl -fsSL https://sing-box.app/deb-install.sh)
        fi

        echo "--> [3/5] Generating TLS certificate for Hysteria2..."
        if [ ! -f /etc/sing-box/cert.pem ]; then
          openssl req -x509 -newkey rsa:2048 -keyout /etc/sing-box/key.pem -out /etc/sing-box/cert.pem -days 3650 -nodes -subj "/CN=www.microsoft.com" 2>/dev/null
          echo "Generated self-signed cert for Hysteria2"
        fi

        echo "--> [4/5] Applying configuration..."
        mkdir -p /etc/sing-box &&
        echo '${JSON.stringify(singboxConfig)}' > /etc/sing-box/config.json &&

        echo "--> [5/5] Restarting sing-box service..." &&
        systemctl restart sing-box &&
        sleep 2 &&
        systemctl is-active sing-box &&
        ss -tulpn | grep 443 || echo "WARN: Port 443 might not be active, check logs via journalctl -u sing-box"
      `.trim()

      
      conn.exec(configCmd, (err, stream) => {
        stream.on('data', (d: Buffer) => process.stdout.write(d)).on('stderr', (d: Buffer) => process.stderr.write(d)).on('close', () => {
          conn.end()
          resolve(true)
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
  
  const whereClause: any = { isActive: true, sshPass: { not: null } }
  if (process.env.TARGET_NODE_ID) {
    whereClause.id = process.env.TARGET_NODE_ID
  }
  const locations = await prisma.location.findMany({ where: whereClause })
  for (const loc of (locations as any[])) {
    await syncAll(loc, subscriptions)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
