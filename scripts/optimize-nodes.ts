import { Client } from 'ssh2';
import prisma from '@/lib/db';

async function optimizeServer(node: any) {
  console.log(`\n🚀 Optimizing ${node.name} (${node.host})...`);
  const conn = new Client();
  
  return new Promise((resolve) => {
    conn.on('ready', () => {
      console.log(`✅ Connected to ${node.host}`);

      const optimizeCmd = `
        set -e
        echo "--- Setting up 8GB Swap ---"
        if [ -f /swapfile ]; then
          swapoff /swapfile || true
          rm /swapfile
        fi
        fallocate -l 8G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=8192
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        if ! grep -q "/swapfile" /etc/fstab; then
          echo '/swapfile none swap sw 0 0' >> /etc/fstab
        fi
        echo "Swap resized to 8GB and enabled."

        echo "--- Tuning Kernel Parameters ---"
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
vm.swappiness = 10
net.netfilter.nf_conntrack_max = 1048576
# Long RTT paths: меньше задержка на мелких ответах, устойчивее тонкие потоки
net.ipv4.tcp_autocorking = 0
net.ipv4.tcp_thin_linear_timeouts = 1
EOF
        sysctl --system || sysctl -p /etc/sysctl.d/zz-privatvpn.conf || true

        echo "--- Increasing File Descriptor Limits ---"
        if ! grep -q "nofile 1000000" /etc/security/limits.conf; then
          echo "* soft nofile 1000000" >> /etc/security/limits.conf
          echo "* hard nofile 1000000" >> /etc/security/limits.conf
          echo "Limits updated."
        fi

        echo "--- Success ---"
      `;

      conn.exec(optimizeCmd, (err, stream) => {
        if (err) {
          console.error(`❌ Error on ${node.host}:`, err);
          conn.end();
          return resolve(false);
        }
        stream.on('data', (data: Buffer) => {
          process.stdout.write(data.toString());
        });
        stream.on('stderr', (data: Buffer) => {
          process.stderr.write(data.toString());
        });
        stream.on('close', () => {
          conn.end();
          console.log(`✅ ${node.name} Optimization Complete.`);
          resolve(true);
        });
      });
    }).on('error', (err) => {
      console.error(`❌ Connection error for ${node.host}:`, err.message);
      resolve(false);
    }).connect({
      host: node.host,
      port: 22,
      username: node.sshUser || 'root',
      password: node.sshPass
    });
  });
}

async function main() {
  const nodes = await prisma.location.findMany({
    where: {
      id: { in: ['germany1', 'germany2', 'netherlands1'] }
    }
  });

  if (nodes.length === 0) {
    console.log("No nodes found to optimize.");
    return;
  }

  for (const node of nodes) {
    await optimizeServer(node);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
