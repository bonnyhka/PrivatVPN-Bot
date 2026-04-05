
import { Client } from 'ssh2'

const node = { id: 'netherlands1', host: '45.84.222.96', pass: process.env.VPN_NODE_PASSWORD || '' }

async function debugNode(node: any) {
  return new Promise((resolve) => {
    const conn = new Client()
    conn.on('ready', () => {
      console.log(`\n--- DIAGNOSIS: ${node.id} (${node.host}) ---`)
      const cmd = `
        echo "=== Network Interface ==="
        ip route | grep default
        ip addr
        
        echo "=== TC Status ==="
        IFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
        tc qdisc show dev $IFACE
        tc class show dev $IFACE
        
        echo "=== IPTables Filter ==="
        iptables -L INPUT -n -v
        
        echo "=== IPTables Mangle ==="
        iptables -t mangle -L -n -v
        
        echo "=== Kernel Tuning ==="
        sysctl net.ipv4.tcp_congestion_control
        sysctl net.core.default_qdisc
        cat /etc/sysctl.d/99-vpn-optimize.conf /etc/sysctl.d/99-vpn-extra-perf.conf 2>/dev/null
        
        echo "=== Sing-box Status ==="
        systemctl status sing-box --no-pager
        sing-box version
        
        echo "=== Speed Test (Basic) ==="
        curl -s https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py | python3 - --simple
      `
      conn.exec(cmd, (err, stream) => {
        if (err) {
          console.error(`Error executing command on ${node.id}:`, err)
          conn.end()
          return resolve(false)
        }
        stream.on('data', (d: any) => process.stdout.write(d)).on('stderr', (d: any) => process.stderr.write(d)).on('close', () => {
          conn.end()
          resolve(true)
        })
      })
    }).on('error', (err) => {
      console.error(`Connection error to ${node.id} (${node.host}):`, err.message)
      resolve(false)
    }).connect({
      host: node.host,
      port: 22,
      username: 'root',
      password: node.pass,
      timeout: 20000
    })
  })
}

debugNode(node).catch(console.error)
