
import prisma from '@/lib/db'
import { Client } from 'ssh2'

async function optimizeServer(loc: any) {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('ready', () => {
      console.log(`Optimizing ${loc.name}...`)
      
      const sysctlCmd = `
        cat <<EOF > /etc/sysctl.d/zz-privatvpn.conf
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65536
net.core.rmem_max = 67108864
net.core.wmem_max = 67108864
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_notsent_lowat = 16384
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_mtu_probing = 1
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_no_metrics_save = 1
net.ipv4.tcp_adv_win_scale = 1
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_sack = 1
net.ipv4.tcp_ecn = 2
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 2
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.tcp_max_tw_buckets = 500000
net.core.optmem_max = 25165824
net.ipv4.udp_rmem_min = 16384
net.ipv4.udp_wmem_min = 16384
fs.file-max = 1000000
# Long RTT (RU→EU и т.п.): меньше буферизации мелких пакетов
net.ipv4.tcp_autocorking = 0
net.ipv4.tcp_thin_linear_timeouts = 1
EOF
        sysctl --system || sysctl -p /etc/sysctl.d/zz-privatvpn.conf
      `
      
      conn.exec(sysctlCmd, (err, stream) => {
        stream.on('data', d => process.stdout.write(d)).on('close', () => {
          console.log(`Applied sysctl to ${loc.name}`)
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
  const locations = await prisma.location.findMany({ where: { isActive: true, sshPass: { not: null } } })
  for (const loc of locations) {
    await optimizeServer(loc)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
