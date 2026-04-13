import prisma from '@/lib/db'
import dns from 'dns'
import { promisify } from 'util'
import { decryptField } from '@/lib/field-encryption'

const lookup = promisify(dns.lookup)

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = await (params as any)
  
  const [location, activeSubs, allLocs] = await Promise.all([
    prisma.location.findUnique({ where: { id } }),
    prisma.subscription.findMany({
      where: { status: 'active' },
      select: { vlessUuid: true }
    }),
    prisma.location.findMany({
       where: { isActive: true, id: { not: id } },
       select: { host: true }
    })
  ])

  if (!location) {
    return new Response('Location not found', { status: 404 })
  }

  const otherNodeIps: string[] = []
  for (const loc of allLocs) {
    try {
      const { address } = await lookup(loc.host)
      otherNodeIps.push(address)
    } catch (e) {}
  }

  const baseUsers = (activeSubs || [])
    .filter(s => s.vlessUuid)
    .map(s => ({ name: s.vlessUuid!, uuid: s.vlessUuid! }))

  // Ensure users exist
  if (baseUsers.length === 0) {
    baseUsers.push({ name: 'emergency-test', uuid: '1cf2d372-bd4e-4cd2-aec2-7bdf1aba5e4e' })
  }

  // Decrypt sensitive fields
  const privateKey = decryptField(location.vlessRealityPrivateKey) || ''

  const vlessPorts = [80, 443, 8443, 9443, 10443, 11443, 12443]
  
  const isRussia = location.flag === 'RU' || location.country === 'Russia'

  const config = {
    'log': { 'level': 'info', 'timestamp': true },
    'dns': {
      ...(isRussia ? { 'strategy': 'prefer_ipv4' } : {}),
      'servers': [
        { 'tag': 'proxy-dns', 'address': 'https://dns.adguard-dns.com/dns-query', 'address_resolver': 'local-dns', 'detour': isRussia ? 'nl-out' : 'direct' },
        { 'tag': 'local-dns', 'address': '8.8.8.8', 'detour': 'direct' },
        { 'tag': 'block-dns', 'address': 'rcode://name_error' }
      ],
      'rules': [
        { 'geosite': ['category-ads-all'], 'server': 'block-dns' },
        { 
          'domain': [
            'nl1.privatevp.space', 'de1.privatevp.space', 'ru1.privatevp.space', 
            'dns.adguard-dns.com', 'github.com', 'raw.githubusercontent.com'
          ], 
          'server': 'local-dns' 
        }
      ],
      'final': 'proxy-dns'
    },
    'inbounds': [
      ...vlessPorts.map(port => ({
        'type': 'vless',
        'tag': `vless-in-${port}`,
        'listen': '0.0.0.0',
        'listen_port': port,
        'sniff': true,
        'users': baseUsers,
        'tls': {
          'enabled': true,
          'server_name': location.vlessRealitySni || 'dl.google.com',
          'reality': {
            'enabled': true,
            'handshake': { 'server': location.vlessRealitySni || 'dl.google.com', 'server_port': 443 },
            'private_key': privateKey,
            'short_id': [location.vlessRealityShortId || '8e70f204859bc060']
          }
        }
      })),
      {
        'type': 'shadowsocks',
        'tag': 'ss-inter-node',
        'listen': '0.0.0.0',
        'listen_port': 448,
        'method': 'aes-128-gcm',
        'password': 'PrivatVPN-Shadow-Secret-Link-2026'
      }
    ],
    'outbounds': [
      { 'type': 'direct', 'tag': 'direct' },
      { 'type': 'block', 'tag': 'block' },
      { 'type': 'dns', 'tag': 'dns-out' },
      ...(isRussia ? [{
        'type': 'shadowsocks',
        'tag': 'nl-out',
        'server': 'nl1.privatevp.space',
        'server_port': 448,
        'method': 'aes-128-gcm',
        'password': 'PrivatVPN-Shadow-Secret-Link-2026'
      }] : []),
      ...(isRussia ? [{
        'type': 'socks',
        'tag': 'byedpi-out',
        'server': '127.0.0.1',
        'server_port': 1080
      }] : [])
    ],
    'route': {
      'auto_detect_interface': true,
      ...(isRussia ? {
        'rule_set': [
          {
            'tag': 'antizapret',
            'type': 'remote',
            'format': 'binary',
            'url': 'https://krasovs.ky/sing-box/antizapret.srs',
            'download_detour': 'nl-out'
          }
        ]
      } : {}),
      'rules': [
        { 'protocol': 'dns', 'outbound': 'dns-out' },
        ...(isRussia ? [
          // Infrastructure bypass
          { 
            'ip_cidr': [
              '144.31.220.23', '185.72.147.29', '45.84.222.96', 
              '8.8.8.8', '1.1.1.1', '1.0.0.1', '8.8.4.4'
            ], 
            'outbound': 'direct' 
          },
          { 
            'domain': [
              'nl1.privatevp.space', 'de1.privatevp.space', 'ru1.privatevp.space', 
              'dns.adguard-dns.com', 'github.com', 'raw.githubusercontent.com',
              'objects.githubusercontent.com'
            ], 
            'outbound': 'direct' 
          },
          // Google Services & Gemini AI -> Netherlands tunnel (to avoid Geo-blocking)
          { 'geosite': ['google', 'category-ai-chat'], 'outbound': 'nl-out' },
          { 'domain_suffix': [
            'google.com', 'googleapis.com', 'gstatic.com', 'googleusercontent.com', 
            'google-analytics.com', 'googletagmanager.com', 'ggpht.com', 
            'gemini.google.com', 'aistudio.google.com', 'generativelanguage.googleapis.com',
            'accounts.google.com', 'clients4.google.com'
          ], 'outbound': 'nl-out' },
          // Block QUIC (UDP 443) for Google to force TCP which is more stable for tunneling
          { 
            'protocol': 'udp', 
            'port': 443, 
            'geosite': ['google'], 
            'outbound': 'block' 
          },
          // Russian services (geoip ru is usually safe to go direct)
          { 'geoip': ['ru'], 'outbound': 'direct' },
          // YouTube Video Traffic -> Local ByeDPI unblocker (keeps video speed max)
          { 'domain_suffix': ['googlevideo.com', 'ytimg.com'], 'outbound': 'byedpi-out' },
          { 'geosite': ['youtube'], 'outbound': 'byedpi-out' },

          // Everything blocked in Russia → tunnel through Netherlands
          { 'rule_set': 'antizapret', 'outbound': 'nl-out' },
          // Explicit rules for key services (in case not in antizapret)
          { 'geosite': ['telegram', 'discord'], 'outbound': 'nl-out' },
          { 'geosite': ['instagram', 'facebook', 'twitter', 'tiktok'], 'outbound': 'nl-out' },
          { 'geoip': ['telegram', 'google', 'netflix'], 'outbound': 'nl-out' },
          { 'domain_suffix': ['.openai.com', '.anthropic.com', 'chatgpt.com', 'claude.ai'], 'outbound': 'nl-out' }
        ] : [])
      ],
      'final': 'direct'
    },
    'experimental': {
      ...(isRussia ? { 'cache_file': { 'enabled': true, 'path': 'cache.db' } } : {}),
      'clash_api': {
        'external_controller': '127.0.0.1:9090'
      },
      'v2ray_api': {
        'listen': '127.0.0.1:10086',
        'stats': {
          'enabled': true,
          'inbounds': vlessPorts.map(p => `vless-in-${p}`),
          'users': baseUsers.map(u => u.name)
        }
      }
    }
  }

  const configBase64 = Buffer.from(JSON.stringify(config, null, 2)).toString('base64')

  const script = `#!/bin/bash
echo "--> Applying FULL PRODUCTION node fix for ${location.name}..."
mkdir -p /etc/sing-box

echo "--> [1/4] Optimizing network..."
cat <<EOF > /etc/sysctl.d/zz-privatvpn.conf
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
net.ipv4.tcp_fastopen=3
net.ipv4.tcp_mtu_probing=1
EOF
sysctl --system || true

echo "--> [2/4] Restoring config & stats API..."
echo "${configBase64}" | base64 -d > /etc/sing-box/config.json

echo "--> [3/4] Opening ports..."
# Open VLESS ports
for port in 80 443 8443 9443 10443 11443 12443 543 448; do
  iptables -I INPUT -p tcp --dport $port -j ACCEPT  2>/dev/null || true
done
# Open Stats API port (Local only)
iptables -I INPUT -p tcp --dport 9090 -s 127.0.0.1 -j ACCEPT 2>/dev/null || true

echo "--> [4/4] Restarting sing-box..."
systemctl stop sing-box
pkill -9 sing-box || true
if [ -f /usr/bin/sing-box-custom ]; then
  echo "Found custom sing-box with stats API. Replacing default binary..."
  mv /usr/bin/sing-box-custom /usr/bin/sing-box
fi
systemctl start sing-box
sleep 2
systemctl status sing-box --no-pager
echo "--> DONE!"
`

  return new Response(script, {
    headers: { 'Content-Type': 'text/plain' }
  })
}
