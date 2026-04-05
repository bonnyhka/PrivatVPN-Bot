import prisma from '@/lib/db'
import { Client } from 'ssh2'
import crypto from 'crypto'

async function syncAll(loc: any, subscriptions: any[]) {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('error', (err) => {
      console.error(`SSH Connection Error for ${loc.name}:`, err.message)
      resolve(false)
    })
    conn.on('ready', () => {
      console.log(`Syncing Sing-box to ${loc.name} (${loc.host})...`)
      
      const vlessUsers = subscriptions.map(sub => ({
        uuid: sub.vlessUuid,
        name: sub.vlessUuid,
        flow: 'xtls-rprx-vision'
      }))

      const vlessPorts = [8443, 9443, 10443, 11443, 12443]
      const ssPassword = crypto.createHash('md5').update(`${loc.id}privat`).digest('hex')

      // Best REALITY SNI: dl.google.com is globally reachable, not blocked in RU,
      // and serves valid TLS on 443 — ideal cover traffic for Russian DPI evasion.
      const realitySni = loc.vlessRealitySni || 'dl.google.com'

      const singboxConfig = {
        'log': { 'level': 'info', 'timestamp': true },
        'dns': {
          'servers': [
            { 'tag': 'cloudflare', 'address': 'https://1.1.1.1/dns-query', 'address_resolver': 'bootstrap-dns', 'detour': 'direct' },
            { 'tag': 'google', 'address': 'https://8.8.8.8/dns-query', 'address_resolver': 'bootstrap-dns', 'detour': 'direct' },
            { 'tag': 'adguard', 'address': 'https://dns.adguard-dns.com/dns-query', 'address_resolver': 'bootstrap-dns', 'detour': 'direct' },
            { 'tag': 'bootstrap-dns', 'address': '8.8.8.8', 'detour': 'direct' },
            { 'tag': 'block-dns', 'address': 'rcode://name_error' },
            { 'tag': 'local', 'address': 'local', 'detour': 'direct' }
          ],
          'rules': [
            { 'geosite': ['category-ads-all'], 'server': 'block-dns', 'disable_cache': true }
          ],
          'final': 'cloudflare',
          'strategy': 'ipv4_only'
        },
        'inbounds': [
          ...vlessPorts.map(port => ({
            'type': 'vless',
            'tag': `vless-in-${port}`,
            'listen': '::',
            'listen_port': port,
            'tcp_fast_open': true,
            // tcp_multi_path adds scheduling complexity and increases jitter variance — disabled for lowest latency
            'sniff': true,
            'sniff_override_destination': true,
            'users': vlessUsers,
            'tls': {
              'enabled': true,
              'server_name': realitySni,
              'reality': {
                'enabled': true,
                'handshake': { 'server': realitySni, 'server_port': 443 },
                'private_key': loc.vlessRealityPrivateKey,
                'short_id': [loc.vlessRealityShortId || '8e70f204859bc060']
              }
            }
          })),
          {
            'type': 'shadowsocks',
            'tag': 'ss-in-15113',
            'listen': '::',
            'listen_port': 15113,
            'tcp_fast_open': true,
            'tcp_multi_path': true,
            'method': 'chacha20-ietf-poly1305',
            'password': ssPassword
          },
          {
            'type': 'hysteria2',
            'tag': 'hy2-in-443',
            'listen': '::',
            'listen_port': 443,
            // Explicit bandwidth hints help Hysteria2 BBR saturate the channel correctly
            // Server has 1Gbps uplink; client-side limit is set in the subscription URL
            'up_mbps': 500,
            'down_mbps': 500,
            'users': vlessUsers.map(u => ({ 'name': u.uuid, 'password': u.uuid })),
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
            'external_controller': '127.0.0.1:9090'
          },
          'v2ray_api': {
            'listen': '127.0.0.1:10086',
            'stats': {
              'enabled': true,
              'inbounds': vlessPorts.map(p => `vless-in-${p}`).concat(['ss-in-15113', 'hy2-in-443']),
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

        echo "--> [1/4] Installing TCP Brutal kernel module..."
        apt-get install -y linux-headers-$(uname -r) make gcc git 2>/dev/null || true
        if [ ! -d /opt/tcp-brutal ]; then
          git clone --depth=1 https://github.com/apernet/tcp-brutal /opt/tcp-brutal 2>/dev/null || true
        fi
        if [ -d /opt/tcp-brutal ]; then
          cd /opt/tcp-brutal && make 2>/dev/null && make load 2>/dev/null || true
          cd /
        fi

        echo "--> [1b/4] Installing MTProto Proxy (mtg)..."
        if ! command -v mtg >/dev/null 2>&1; then
          curl -fsSL https://github.com/9seconds/mtg/releases/download/v2.1.7/mtg-2.1.7-linux-amd64.tar.gz | tar -xz --strip-components=1 -C /usr/local/bin mtg
          chmod +x /usr/local/bin/mtg
        fi
        cat << 'MTG_EOF' > /etc/systemd/system/mtg.service
[Unit]
Description=MTProto Proxy (mtg)
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/mtg run eed2709de4ef1349ff8f13dc64efb17311676f6f676c652e636f6d -b 0.0.0.0:543
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
MTG_EOF
        systemctl daemon-reload
        systemctl enable mtg
        systemctl restart mtg

        echo "--> [2/4] Applying advanced kernel network tuning..."
        cat << 'SYSCTL_EOF' > /etc/sysctl.d/99-vpn-turbo.conf
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_mtu_probing = 1
net.core.rmem_max = 67108864
net.core.wmem_max = 67108864
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_notsent_lowat = 16384
net.ipv4.tcp_frto = 2
net.ipv4.tcp_ecn = 1
net.ipv4.tcp_fin_timeout = 15
net.core.netdev_max_backlog = 250000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_max_tw_buckets = 500000
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535
SYSCTL_EOF
        sysctl --system -q

        iptables -t mangle -D POSTROUTING -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1350 2>/dev/null || true
        iptables -t mangle -A POSTROUTING -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1350

        echo "--> [2b/4] Tuning traffic queue for minimal jitter..."
        IFACE=$(ip route show default | awk '/default/ {print $5; exit}')
        if [ -n "$IFACE" ]; then
          # Use 'fq' (Fair Queue with pacing) not 'fq_codel' — BBR requires fq for its pacing mechanism
          # quantum=15140 = 10 MTU per round, allows better burst for video streaming
          # flow_limit=200 prevents a single flow from starving others
          tc qdisc replace dev $IFACE root fq quantum 15140 flow_limit 200 2>/dev/null || true
          echo "fq pacing tuned for $IFACE"
        fi

        echo "--> [3/4] Writing sing-box configuration..."
        mkdir -p /etc/sing-box &&
        echo '${JSON.stringify(singboxConfig)}' > /etc/sing-box/config.json &&

        echo "--> [4/4] Restarting sing-box service..."
        systemctl restart sing-box
        sleep 1
        systemctl is-active sing-box && echo "==> sing-box: OK" || echo "==> sing-box: FAILED"
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
  const locations = await prisma.location.findMany({ where: whereClause })
  for (const loc of (locations as any[])) {
    await syncAll(loc, subscriptions)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
