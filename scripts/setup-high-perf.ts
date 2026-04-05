import prisma from '@/lib/db'
import { Client } from 'ssh2'
import crypto from 'crypto'
import { createStrongPassword } from '../lib/security'

/**
 * HIGH-PERFORMANCE SERVER SETUP SCRIPT
 * Usage: npx tsx scripts/setup-high-perf.ts <id> <host> <pass> <name> <country> <flag>
 */

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 6) {
    console.error('Usage: npx tsx scripts/setup-high-perf.ts <id> <host> <pass> <name> <country> <flag>')
    process.exit(1)
  }

  const [id, host, pass, name, country, flag] = args

  console.log(`🚀 Starting high-performance setup for ${name} (${host})...`)

  const conn = new Client()
  
  return new Promise((resolve, reject) => {
    conn.on('ready', () => {
      console.log('✅ SSH Connected')

      const setupCmd = `
        set -e
        export DEBIAN_FRONTEND=noninteractive

        echo "--- Tuning Kernel for High-Performance Networking ---"
        cat <<EOF > /etc/sysctl.d/zz-privatvpn.conf
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
net.core.somaxconn=65535
net.core.netdev_max_backlog=65536
net.core.rmem_max=67108864
net.core.wmem_max=67108864
net.ipv4.tcp_rmem=4096 87380 67108864
net.ipv4.tcp_wmem=4096 65536 67108864
net.ipv4.ip_local_port_range=1024 65535
net.ipv4.tcp_notsent_lowat=16384
net.ipv4.tcp_slow_start_after_idle=0
net.ipv4.tcp_mtu_probing=1
net.ipv4.tcp_fastopen=3
net.ipv4.tcp_no_metrics_save=1
net.ipv4.tcp_adv_win_scale=1
net.ipv4.tcp_window_scaling=1
net.ipv4.tcp_timestamps=1
net.ipv4.tcp_sack=1
net.ipv4.tcp_ecn=2
net.ipv4.tcp_fin_timeout=15
net.ipv4.tcp_tw_reuse=2
net.ipv4.tcp_keepalive_time=300
net.ipv4.tcp_keepalive_intvl=30
net.ipv4.tcp_keepalive_probes=5
net.ipv4.tcp_max_syn_backlog=65536
net.ipv4.tcp_max_tw_buckets=500000
net.core.optmem_max=25165824
net.ipv4.udp_rmem_min=16384
net.ipv4.udp_wmem_min=16384
fs.file-max=1000000
net.ipv6.conf.all.disable_ipv6=0
net.ipv6.conf.default.disable_ipv6=0
# Long RTT (e.g. RU→EU): меньше склейки мелких пакетов, быстрее таймауты на тонких потоках
net.ipv4.tcp_autocorking=0
net.ipv4.tcp_thin_linear_timeouts=1
EOF
        sysctl --system || sysctl -p /etc/sysctl.d/zz-privatvpn.conf || true

        # Keep IFB MTU aligned with the real NIC so fq_codel doesn't inherit a huge quantum.
        modprobe ifb numifbs=1 2>/dev/null || true
        IFACE=$(ip route | awk '/default/ {print $5; exit}')
        IFACE_MTU=$(cat /sys/class/net/$IFACE/mtu 2>/dev/null || echo 1500)
        ip link set dev ifb0 mtu $IFACE_MTU txqueuelen 2048 up 2>/dev/null || true
        # Throughput-oriented profile for 1 vCPU nodes: keep common offloads on
        # and avoid ultra-aggressive interrupt settings that burn CPU.
        ethtool -K $IFACE tso on gso on gro on 2>/dev/null || true
        ethtool -C $IFACE adaptive-rx off rx-usecs 8 rx-frames 8 tx-usecs 8 tx-frames 8 2>/dev/null || true

        echo "--- Installing Dependencies ---"
        apt-get update && apt-get install -y curl gnupg2 ca-certificates lsb-release jq speedtest-cli || true

        echo "--- Enabling Persistent Logs ---"
        mkdir -p /var/log/privatvpn /etc/systemd/journald.conf.d /usr/local/bin
        cat <<EOF > /etc/systemd/journald.conf.d/99-privatvpn.conf
[Journal]
Storage=persistent
Compress=yes
SystemMaxUse=512M
RuntimeMaxUse=128M
MaxRetentionSec=7day
EOF
        systemctl restart systemd-journald || true

        cat <<'EOF' > /usr/local/bin/privatvpn-export-logs.sh
#!/usr/bin/env bash
set -euo pipefail
mkdir -p /var/log/privatvpn
journalctl -u sing-box --since "24 hours ago" --no-pager > /var/log/privatvpn/sing-box-recent.log || true
journalctl -u sing-box -p warning..emerg --since "7 days ago" --no-pager > /var/log/privatvpn/sing-box-errors.log || true
journalctl -u privatvpn-network.service --since "24 hours ago" --no-pager > /var/log/privatvpn/network-recent.log || true
chmod 0644 /var/log/privatvpn/*.log 2>/dev/null || true
EOF
        chmod +x /usr/local/bin/privatvpn-export-logs.sh

        cat <<'EOF' > /etc/systemd/system/privatvpn-export-logs.service
[Unit]
Description=Export recent PrivatVPN logs
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/privatvpn-export-logs.sh
EOF

        cat <<'EOF' > /etc/systemd/system/privatvpn-export-logs.timer
[Unit]
Description=Refresh PrivatVPN log snapshots every 5 minutes

[Timer]
OnCalendar=*:0/5
Persistent=true
Unit=privatvpn-export-logs.service

[Install]
WantedBy=timers.target
EOF
        systemctl daemon-reload
        systemctl enable --now privatvpn-export-logs.timer || true

        echo "--- Installing Xray ---"
        bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install -u root
        
        echo "--- Generating Keys ---"
        KEYS=$(/usr/local/bin/xray x25519)
        PRIVATE_KEY=$(echo "$KEYS" | grep "PrivateKey:" | awk '{print $2}')
        PUBLIC_KEY=$(echo "$KEYS" | grep "PublicKey:" | awk '{print $2}')

        if [ -z "$PRIVATE_KEY" ]; then
          echo "ERROR_KEYS_FAILED"
          exit 1
        fi

        echo "--- Performing Speed Test ---"
        SPEED_RESULT=$(speedtest-cli --simple || echo "Speedtest failed")
        echo "SPEED_TEST_OUTPUT: $SPEED_RESULT"

        echo "RESULT_KEYS: $PRIVATE_KEY $PUBLIC_KEY"
      `

      let output = ''
      conn.exec(setupCmd, (err: Error | undefined, stream: any) => {
        if (err) return reject(err)
        
        stream.on('data', (d: Buffer) => {
          const chunk = d.toString()
          output += chunk
          process.stdout.write(chunk)
        })

        stream.on('close', async (code: number) => {
          conn.end()
          if (code !== 0) {
            console.error('❌ Setup failed with code', code)
            return resolve(false)
          }

          const keysMatch = output.match(/RESULT_KEYS: (\S+) (\S+)/)
          if (!keysMatch) {
            console.error('❌ Could not parse keys from output')
            return resolve(false)
          }

          const [, privateKey, publicKey] = keysMatch
          
          console.log(`\n🎉 Setup finished! Storing in DB...`)
          
          const bootstrapUuid = crypto.randomUUID()
          const bootstrapSsPassword = createStrongPassword(28)

          await prisma.location.upsert({
            where: { id },
            update: {
              host,
              name,
              country,
              flag,
              sshUser: 'root',
              sshPass: pass,
              vlessRealityPrivateKey: privateKey,
              vlessRealityPublicKey: publicKey,
              isActive: true,
              vlessPort: 443,
              vlessReality: true,
              vlessRealitySni: 'www.microsoft.com',
              vlessRealityShortId: '8e70f204859bc060'
            },
            create: {
              id,
              host,
              name,
              country,
              flag,
              sshUser: 'root',
              sshPass: pass,
              vlessRealityPrivateKey: privateKey,
              vlessRealityPublicKey: publicKey,
              isActive: true,
              vlessPort: 443,
              vlessReality: true,
              vlessRealitySni: 'www.microsoft.com',
              vlessRealityShortId: '8e70f204859bc060',
              vlessUuid: bootstrapUuid,
              ssPort: 8443,
              ssPassword: bootstrapSsPassword
            } as any
          })

          console.log(`✅ ${name} is now registered and optimized!`)
          resolve(true)
        })
      })
    }).connect({
      host,
      port: 22,
      username: 'root',
      password: pass
    })
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
