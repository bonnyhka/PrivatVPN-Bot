import prisma from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = await (params as any)
  
  const [location, activeSubs] = await Promise.all([
    prisma.location.findUnique({ where: { id } }),
    prisma.subscription.findMany({
      where: { status: 'active' },
      select: { vlessUuid: true }
    })
  ])

  if (!location) {
    return new Response('Location not found', { status: 404 })
  }

  const vlessUsers = (activeSubs || [])
    .filter(s => s.vlessUuid)
    .map(s => ({ name: s.vlessUuid!, uuid: s.vlessUuid!, flow: 'xtls-rprx-vision' }))

  const vlessPorts = [80, 443, 448, 8443, 9443, 10443, 11443, 12443]
  
  const config = {
    'log': { 'level': 'info', 'timestamp': true, 'disabled': false },
    'dns': {
      'servers': [
        { 'tag': 'google', 'address': '8.8.8.8', 'detour': 'direct' },
        { 'tag': 'local', 'address': 'local', 'detour': 'direct' }
      ],
      'final': 'google'
    },
    'inbounds': [
      ...vlessPorts.map(port => ({
        'type': 'vless',
        'tag': `vless-in-${port}`,
        'listen': '::',
        'listen_port': port,
        'sniff': true,
        'users': vlessUsers,
        'tls': {
          'enabled': true,
          'server_name': location.vlessRealitySni || 'dl.google.com',
          'reality': {
            'enabled': true,
            'handshake': { 'server': location.vlessRealitySni || 'dl.google.com', 'server_port': 443 },
            'private_key': location.vlessRealityPrivateKey || '',
            'short_id': [location.vlessRealityShortId || '8e70f204859bc060']
          }
        }
      })),
      {
        'type': 'shadowsocks',
        'tag': 'ss-in-15113',
        'listen': '::',
        'listen_port': 15113,
        'method': 'chacha20-ietf-poly1305',
        'password': crypto.createHash('md5').update(`${location.id}privat`).digest('hex')
      },
      {
        'type': 'hysteria2',
        'tag': 'hy2-in-443',
        'listen': '::',
        'listen_port': 443,
        'users': vlessUsers.map(u => ({ 'password': u.uuid })),
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
        'listen': '127.0.0.1:10086'
      }
    },
    'route': {
      'rules': [
        { 'protocol': 'dns', 'outbound': 'dns-out' }
      ],
      'final': 'direct'
    }
  }

  const configBase64 = Buffer.from(JSON.stringify(config, null, 2)).toString('base64')

  const script = "#!/bin/bash\n" +
"echo \"--> Applying PRODUCTION node fix for " + location.name + " (" + vlessUsers.length + " users)...\"\n" +
"mkdir -p /etc/sing-box\n" +
"\necho \"--> [1/4] Optimizing network (BBR, Fast Open & Advanced Tuning)...\"\n" +
"cat <<EOF > /etc/sysctl.d/zz-privatvpn.conf\n" +
"# Network Core\n" +
"net.core.default_qdisc=fq\n" +
"net.ipv4.tcp_congestion_control=bbr\n" +
"net.core.somaxconn=65535\n" +
"net.core.netdev_max_backlog=65536\n" +
"net.core.rmem_max=67108864\n" +
"net.core.wmem_max=67108864\n" +
"net.core.optmem_max=65536\n" +
"\n" +
"# TCP Memory & Buffers\n" +
"net.ipv4.tcp_rmem=4096 87380 67108864\n" +
"net.ipv4.tcp_wmem=4096 65536 67108864\n" +
"net.ipv4.tcp_mem=65536 131072 262144\n" +
"\n" +
"# TCP Connection Handling\n" +
"net.ipv4.tcp_max_syn_backlog=65536\n" +
"net.ipv4.tcp_max_tw_buckets=500000\n" +
"net.ipv4.tcp_tw_reuse=1\n" +
"net.ipv4.tcp_fin_timeout=15\n" +
"net.ipv4.tcp_keepalive_time=600\n" +
"net.ipv4.tcp_keepalive_intvl=30\n" +
"net.ipv4.tcp_keepalive_probes=3\n" +
"\n" +
"# TCP Performance & Features\n" +
"net.ipv4.tcp_fastopen=3\n" +
"net.ipv4.tcp_slow_start_after_idle=0\n" +
"net.ipv4.tcp_mtu_probing=1\n" +
"net.ipv4.tcp_base_mss=1024\n" +
"net.ipv4.tcp_rfc1337=1\n" +
"net.ipv4.tcp_timestamps=1\n" +
"net.ipv4.tcp_sack=1\n" +
"net.ipv4.tcp_fack=1\n" +
"net.ipv4.tcp_window_scaling=1\n" +
"net.ipv4.tcp_adv_win_scale=1\n" +
"net.ipv4.tcp_notsent_lowat=16384\n" +
"net.ipv4.tcp_no_metrics_save=1\n" +
"net.ipv4.tcp_ecn=1\n" +
"net.ipv4.tcp_frto=2\n" +
"\n" +
"# UDP Performance\n" +
"net.ipv4.udp_rmem_min=16384\n" +
"net.ipv4.udp_wmem_min=16384\n" +
"\n" +
"# IP Routing & Security\n" +
"net.ipv4.ip_local_port_range=10000 65535\n" +
"net.ipv4.conf.all.rp_filter=1\n" +
"net.ipv4.conf.default.rp_filter=1\n" +
"net.ipv4.conf.all.accept_source_route=0\n" +
"net.ipv4.conf.default.accept_source_route=0\n" +
"net.ipv4.conf.all.send_redirects=0\n" +
"net.ipv4.conf.default.send_redirects=0\n" +
"net.ipv4.conf.all.accept_redirects=0\n" +
"net.ipv4.conf.default.accept_redirects=0\n" +
"\n" +
"# System\n" +
"fs.file-max=1000000\n" +
"vm.swappiness=10\n" +
"vm.dirty_ratio=60\n" +
"vm.dirty_background_ratio=2\n" +
"EOF\n" +
"sysctl --system || sysctl -p /etc/sysctl.d/zz-privatvpn.conf || true\n" +
"\n" +
"echo \"--> [1.5/4] Optimizing Network Interface (ethtool)...\"\n" +
"IFACE=$(ip route | awk '/default/ {print $5; exit}')\n" +
"ethtool -K $IFACE tso on gso on gro on 2>/dev/null || true\n" +
"ethtool -C $IFACE adaptive-rx off rx-usecs 8 rx-frames 8 tx-usecs 8 tx-frames 8 2>/dev/null || true\n" +
"\n" +
"echo \"--> [1.6/4] Applying TCPMSS clamping...\"\n" +
"iptables -t mangle -D POSTROUTING -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1350 2>/dev/null || true\n" +
"iptables -t mangle -A POSTROUTING -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1350 2>/dev/null || true\n" +
"\n" +
"echo \"--> [1.7/4] Configuring Traffic Shaping (Speed Limits)...\"\n" +
"IFACE=$(ip route | awk '/default/ {print $5; exit}')\n" +
"tc qdisc del dev $IFACE root 2>/dev/null || true\n" +
"tc qdisc add dev $IFACE root handle 1: htb default 10\n" +
"tc class add dev $IFACE parent 1: classid 1:1 htb rate 10gbit\n" +
"tc class add dev $IFACE parent 1:1 classid 1:10 htb rate 10gbit ceil 10gbit\n" +
"tc class add dev $IFACE parent 1:1 classid 1:50 htb rate 52mbit ceil 55mbit\n" +
"tc class add dev $IFACE parent 1:1 classid 1:100 htb rate 105mbit ceil 110mbit\n" +
"tc class add dev $IFACE parent 1:1 classid 1:500 htb rate 525mbit ceil 550mbit\n" +
"\n" +
"# Filters (VLESS)\n" +
"tc filter add dev $IFACE protocol ip parent 1:0 prio 1 u32 match ip dport 9443 0xffff flowid 1:50\n" +
"tc filter add dev $IFACE protocol ip parent 1:0 prio 1 u32 match ip sport 9443 0xffff flowid 1:50\n" +
"tc filter add dev $IFACE protocol ip parent 1:0 prio 1 u32 match ip dport 11443 0xffff flowid 1:100\n" +
"tc filter add dev $IFACE protocol ip parent 1:0 prio 1 u32 match ip sport 11443 0xffff flowid 1:100\n" +
"tc filter add dev $IFACE protocol ip parent 1:0 prio 1 u32 match ip dport 10443 0xffff flowid 1:500\n" +
"tc filter add dev $IFACE protocol ip parent 1:0 prio 1 u32 match ip sport 10443 0xffff flowid 1:500\n" +
"\n" +
"# Filters (Shadowsocks 15113)\n" +
"tc filter add dev $IFACE protocol ip parent 1:0 prio 1 u32 match ip dport 15113 0xffff flowid 1:10\n" +
"tc filter add dev $IFACE protocol ip parent 1:0 prio 1 u32 match ip sport 15113 0xffff flowid 1:10\n" +
"\n" +
"echo \"--> [1.8/4] Installing Telegram Stealth Proxy (MTProto)...\"\n" +
"if ! command -v mtg >/dev/null 2>&1; then\n" +
"  wget -qO- https://github.com/9seconds/mtg/releases/download/v2.1.7/mtg-2.1.7-linux-amd64.tar.gz | tar -xz -C /usr/local/bin --strip-components=1 mtg-2.1.7-linux-amd64/mtg\n" +
"  chmod +x /usr/local/bin/mtg\n" +
"fi\n" +
"\n" +
"MT_SECRET=\"ee$(echo -n \"" + location.host + location.name + "privat\" | md5sum | cut -d' ' -f1)676f6f676c652e636f6d\"\n" +
"\n" +
"cat <<EOF > /etc/mtg.toml\n" +
"secret = \"$MT_SECRET\"\n" +
"bind-to = \"0.0.0.0:543\"\n" +
"EOF\n" +
"\n" +
"cat <<EOF > /etc/systemd/system/privatvpn-mtproto.service\n" +
"[Unit]\n" +
"Description=PrivatVPN Telegram Stealth Proxy\n" +
"After=network.target\n" +
"\n" +
"[Service]\n" +
"Type=simple\n" +
"ExecStart=/usr/local/bin/mtg run /etc/mtg.toml\n" +
"Restart=always\n" +
"RestartSec=3\n" +
"\n" +
"[Install]\n" +
"WantedBy=multi-user.target\n" +
"EOF\n" +
"\n" +
"systemctl daemon-reload\n" +
"systemctl enable --now privatvpn-mtproto.service\n" +
"iptables -I INPUT -p tcp --dport 543 -j ACCEPT 2>/dev/null || true\n" +
"\n" +
"echo \"--> [2/4] Restoring config...\"\n" +
"echo \"" + configBase64 + "\" | base64 -d > /etc/sing-box/config.json\n" +
"\n" +
"echo \"--> [3/4] Opening ports...\"\n" +
"for port in 80 443 448 8443 9443 10443 11443 12443 543 15113; do\n" +
"  iptables -I INPUT -p tcp --dport $port -j ACCEPT  2>/dev/null || true\n" +
"done\n" +
"# Open UDP 443 for Hysteria2\n" +
"iptables -I INPUT -p udp --dport 443 -j ACCEPT 2>/dev/null || true\n" +
"\n" +
"echo \"--> [4/4] Restarting sing-box...\"\n" +
"systemctl restart sing-box\n" +
"sleep 1\n" +
"systemctl status sing-box --no-pager\n" +
"echo \"--> DONE!\"\n"

  return new Response(script, {
    headers: { 'Content-Type': 'text/plain' }
  })
}
